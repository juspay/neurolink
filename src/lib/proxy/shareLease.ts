/**
 * Leases — how a lender keeps control of a credential that lives on someone
 * else's machine.
 *
 * In **live** sharing the lender's gate is in the request path, so control is
 * immediate and total. **Complete** sharing trades that away: the borrower holds
 * its own credential on the lender's account and calls the upstream directly, so
 * the lender is not consulted per request. What is left is this — a signed,
 * time-boxed statement of consent that the borrower enforces on itself and must
 * keep renewing.
 *
 * The design turns on one number: **how long may the borrower run without
 * hearing from me.** `offlineGraceMs` is that number. Set it to zero and
 * complete mode collapses into live mode's availability; set it to a day and the
 * borrower keeps working through a weekend when the lender's laptop is shut, at
 * the cost of a day's revocation latency. Both are legitimate; neither is free.
 *
 * `notAfter` is the backstop that does not depend on the borrower's cooperation
 * at all — it is baked into the signed payload, so a borrower that simply never
 * calls home still stops.
 *
 * **Signing.** HMAC-SHA256 keyed by a per-grant secret shared with the borrower
 * at provisioning time. Asymmetric signatures would be tidier, but the key
 * distribution problem they solve does not exist here — exactly two parties are
 * involved and they already share a secret — and the package's browser bundle
 * stubs `node:crypto` down to a subset with no Ed25519 in it.
 *
 * @module proxy/shareLease
 */

import {
  generateShareSecret,
  secretsMatch,
  signSharePayload,
} from "./shareSigning.js";
import type {
  ProxyShareGates,
  ProxyShareGrant,
  ProxyShareLease,
  ProxyShareLeaseRefusal,
  ProxyShareLeaseVerdict,
  ProxyShareProvisionClaim,
} from "../types/index.js";

/** A week: long enough to survive a holiday, short enough to be a real bound. */
export const DEFAULT_LEASE_TTL_MS = 604_800_000;
/** Fifteen minutes — frequent enough that a pause lands the same session. */
export const DEFAULT_HEARTBEAT_MS = 900_000;
/** Twenty-four hours of running unheard-from. The headline trade-off. */
export const DEFAULT_OFFLINE_GRACE_MS = 86_400_000;

/**
 * Narrow a verdict to its refusing half.
 *
 * One of the package's build steps compiles without `strictNullChecks`, where
 * TypeScript will not narrow a boolean discriminant. An explicit predicate holds
 * in both modes — see the same pattern in `sharePolicy.isShareRefusal`.
 */
export function isLeaseRefusal(
  verdict: ProxyShareLeaseVerdict,
): verdict is ProxyShareLeaseRefusal {
  return !verdict.usable;
}

export function generateLeaseSecret(): string {
  return generateShareSecret();
}

/**
 * The signed portion of a lease — everything but the signature itself.
 *
 * Field order is irrelevant: `signSharePayload` canonicalises before hashing.
 * The explicit list is still worth keeping, because it says which fields a
 * borrower is entitled to rely on rather than signing whatever happens to be on
 * the object.
 */
function leasePayload(lease: Omit<ProxyShareLease, "signature">) {
  return {
    schemaVersion: lease.schemaVersion,
    grantId: lease.grantId,
    peerLabel: lease.peerLabel,
    issuedAt: lease.issuedAt,
    notAfter: lease.notAfter,
    heartbeatEveryMs: lease.heartbeatEveryMs,
    offlineGraceMs: lease.offlineGraceMs,
    gates: lease.gates,
    entitlementSnapshot: lease.entitlementSnapshot,
  };
}

function sign(payload: ReturnType<typeof leasePayload>, secret: string) {
  return signSharePayload(payload, secret);
}

/**
 * Issue a lease for a grant.
 *
 * The gates are snapshotted rather than referenced: the borrower enforces what
 * the lender agreed to at issue time, and a tightened policy reaches them at the
 * next heartbeat rather than silently mid-lease.
 */
export function issueLease(
  grant: ProxyShareGrant,
  now: number = Date.now(),
): ProxyShareLease {
  const policy = grant.leasePolicy;
  const secret = grant.leaseSecret;
  if (!secret) {
    throw new Error(
      `Grant ${grant.id} has no lease secret — provision it before issuing a lease.`,
    );
  }
  const ttl = policy?.ttlMs ?? DEFAULT_LEASE_TTL_MS;
  // A lease can never outlive the grant's own expiry.
  const notAfter = Math.min(
    now + ttl,
    grant.gates.notAfter ?? Number.POSITIVE_INFINITY,
  );
  const unsigned: Omit<ProxyShareLease, "signature"> = {
    schemaVersion: 1,
    grantId: grant.id,
    peerLabel: grant.peerLabel,
    issuedAt: now,
    notAfter,
    heartbeatEveryMs: policy?.heartbeatEveryMs ?? DEFAULT_HEARTBEAT_MS,
    offlineGraceMs: policy?.offlineGraceMs ?? DEFAULT_OFFLINE_GRACE_MS,
    gates: grant.gates,
    entitlementSnapshot:
      grant.entitlement.ledger === "coins"
        ? (grant.entitlement.coins ?? 0)
        : "unlimited",
  };
  return { ...unsigned, signature: sign(leasePayload(unsigned), secret) };
}

/** Does this lease actually come from the lender it claims to? */
export function isLeaseAuthentic(
  lease: ProxyShareLease,
  secret: string,
): boolean {
  const { signature, ...unsigned } = lease;
  return secretsMatch(sign(leasePayload(unsigned), secret), signature);
}

/**
 * May the borrower serve from this lease right now?
 *
 * Three independent stops, in the order that matters:
 *
 * 1. **Unsigned** — someone edited the file. Nothing else is worth checking.
 * 2. **Expired** — `notAfter` passed. Immune to a borrower that never checks in.
 * 3. **Grace elapsed** — the lender has been unreachable for longer than it
 *    agreed to be trusted for. This is the one that makes "the lender turned
 *    their laptop off" survivable and "the lender revoked me" eventually
 *    binding.
 */
export function evaluateLease(args: {
  lease: ProxyShareLease;
  secret: string;
  lastHeartbeatAt?: number;
  now?: number;
}): ProxyShareLeaseVerdict {
  const now = args.now ?? Date.now();
  if (!isLeaseAuthentic(args.lease, args.secret)) {
    return {
      usable: false,
      reason: "unsigned",
      detail: "lease signature does not match the lender's secret",
    };
  }
  if (args.lease.notAfter <= now) {
    return {
      usable: false,
      reason: "expired",
      detail: "the lease's hard expiry has passed",
    };
  }
  // The lease's own issue time is the first heartbeat: a freshly provisioned
  // borrower has not failed to check in, it simply has not had to yet.
  const lastContact = args.lastHeartbeatAt ?? args.lease.issuedAt;
  const graceDeadline = lastContact + args.lease.offlineGraceMs;
  if (graceDeadline <= now) {
    return {
      usable: false,
      reason: "grace_elapsed",
      detail:
        "the lender has been unreachable for longer than this lease allows",
    };
  }
  return {
    usable: true,
    nextHeartbeatDueAt: lastContact + args.lease.heartbeatEveryMs,
  };
}

/** Should the borrower check in now? */
export function isHeartbeatDue(
  lease: ProxyShareLease,
  lastHeartbeatAt: number | undefined,
  now: number = Date.now(),
): boolean {
  const lastContact = lastHeartbeatAt ?? lease.issuedAt;
  return now - lastContact >= lease.heartbeatEveryMs;
}

/** The gates a resident grant must enforce on itself, from its lease. */
export function leasedGates(lease: ProxyShareLease): ProxyShareGates {
  return lease.gates;
}

/**
 * Assemble what the borrower collects once the lender has authorized.
 *
 * Carries no token, by construction. The borrower already holds the verifier
 * that turns the enclosed code into tokens, and it exchanges the two on its own
 * machine — so nothing here is worth intercepting, and the lender never holds a
 * credential for the account it just authorized.
 *
 * `accountLabel` is the lender's *suggestion*, not the key the credential ends
 * up under. The borrower names the account itself — `<peer>-shared` unless
 * `--label` says otherwise — and refuses to install over an existing one,
 * because Anthropic quota snapshots are keyed by the bare label and two
 * accounts sharing one would merge each other's windows. Derived from both
 * parties' names so that a lender running `share list` and a borrower running
 * `auth list` are looking at recognisably the same thing.
 */
export function buildProvisionClaim(args: {
  grant: ProxyShareGrant;
  lenderName: string;
  lenderUrl?: string;
  code: string;
  state: string;
  now?: number;
}): ProxyShareProvisionClaim {
  const now = args.now ?? Date.now();
  if (!args.grant.leaseSecret) {
    throw new Error(
      `Grant ${args.grant.id} has no lease secret — attach lease material first.`,
    );
  }
  return {
    code: args.code,
    state: args.state,
    accountLabel: `${args.grant.peerLabel}-via-${args.lenderName}`,
    leaseSecret: args.grant.leaseSecret,
    lease: issueLease(args.grant, now),
    lenderUrl: (args.lenderUrl ?? "").replace(/\/+$/, ""),
  };
}
