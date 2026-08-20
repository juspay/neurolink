/**
 * Split-PKCE provisioning — minting a resident credential without ever holding
 * one.
 *
 * The earlier design had the lender complete an authorization and hand the
 * borrower a file containing a live access token and a refresh token. That file
 * is copyable, re-sharable, and exists on disk in plaintext at both ends for as
 * long as anyone forgets to delete it. Nothing about the lease constrains a
 * credential someone else already copied.
 *
 * This splits the flow along the seam PKCE was designed for:
 *
 * 1. The **borrower** generates a verifier and sends only its SHA-256
 *    challenge, over its authenticated grant.
 * 2. The **lender** authorizes in their own browser, against their own account,
 *    with the borrower's challenge in the URL.
 * 3. The **authorization code** comes back to the lender and is relayed to the
 *    borrower.
 * 4. The **borrower** exchanges code + verifier for tokens, on its own machine.
 *
 * The code is worthless to anyone who intercepts it: the token endpoint will not
 * exchange it without the verifier, which never left the borrower. The lender
 * never possesses a token for the credential it just authorized, so there is
 * nothing for it to leak, re-send, or forget to delete.
 *
 * **What this module owns** is the lender's side of that conversation: the
 * pending request, its binding to one grant, its expiry, and the rule that a
 * code is handed over exactly once.
 *
 * @module proxy/shareProvisioning
 */

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareProvisionFile,
  ProxyShareProvisionOutcome,
  ProxyShareProvisionRequest,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const PROVISION_FILE = "proxy-share-provisioning.json";

/**
 * How long a challenge stays claimable.
 *
 * Long enough for a lender to notice a request and finish a browser login,
 * short enough that a challenge left lying around is not a standing invitation.
 */
export const PROVISION_REQUEST_TTL_MS = 900_000;

/** A base64url SHA-256 digest is always 43 characters, unpadded. */
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** State is ours to choose; bound the shape so a peer cannot smuggle anything. */
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

let customFilePath: string | null = null;
let cache: Record<string, ProxyShareProvisionRequest> = {};
let loaded = false;
const mutationMutex = new AsyncMutex();

export function initShareProvisioning(filePath: string): void {
  customFilePath = filePath;
  cache = {};
  loaded = false;
}

function getFilePath(): string {
  return customFilePath ?? join(homedir(), ".neurolink", PROVISION_FILE);
}

function isRequest(value: unknown): value is ProxyShareProvisionRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyShareProvisionRequest>;
  return (
    typeof candidate.grantId === "string" &&
    typeof candidate.codeChallenge === "string" &&
    typeof candidate.state === "string" &&
    typeof candidate.expiresAt === "number" &&
    typeof candidate.status === "string"
  );
}

async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
  if (loaded && !options.force) {
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(getFilePath(), "utf8"),
    ) as Partial<ProxyShareProvisionFile>;
    cache = Object.fromEntries(
      Object.entries(parsed?.requests ?? {}).filter(
        (entry): entry is [string, ProxyShareProvisionRequest] =>
          isRequest(entry[1]),
      ),
    );
  } catch {
    cache = {};
  }
  loaded = true;
}

async function persist(): Promise<void> {
  const file: ProxyShareProvisionFile = { schemaVersion: 1, requests: cache };
  await writeJsonSnapshotAtomically(getFilePath(), file);
}

/**
 * Narrow an open/authorize outcome to its failing half.
 *
 * One of the package's build steps compiles without `strictNullChecks`, where a
 * boolean discriminant does not narrow. Callers reading `.reason` need this.
 */
export function isProvisionFailure(
  outcome: ProxyShareProvisionOutcome,
): outcome is { ok: false; reason: string } {
  return !outcome.ok;
}

/** Is this request still live? Expiry and consumption both retire it. */
export function isProvisionRequestOpen(
  request: ProxyShareProvisionRequest,
  now: number = Date.now(),
): boolean {
  return request.status !== "consumed" && request.expiresAt > now;
}

/**
 * Record a borrower's challenge.
 *
 * One open request per grant: a second one replaces the first rather than
 * queueing, because the borrower that just asked is the one waiting, and an
 * abandoned challenge should not be claimable later by whoever finds it.
 *
 * Rejects anything that is not a well-formed S256 challenge. The lender is about
 * to put this string into an authorization URL against its own account, so it
 * is not the place to be relaxed about input.
 */
export async function openProvisionRequest(args: {
  grantId: string;
  codeChallenge: string;
  state: string;
  now?: number;
}): Promise<ProxyShareProvisionOutcome> {
  if (!CHALLENGE_PATTERN.test(args.codeChallenge)) {
    return {
      ok: false,
      reason: "code_challenge must be a base64url S256 digest",
    };
  }
  if (!STATE_PATTERN.test(args.state)) {
    return { ok: false, reason: "state must be 16-128 base64url characters" };
  }
  const now = args.now ?? Date.now();
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const request: ProxyShareProvisionRequest = {
      schemaVersion: 1,
      grantId: args.grantId,
      codeChallenge: args.codeChallenge,
      challengeMethod: "S256",
      state: args.state,
      requestedAt: now,
      expiresAt: now + PROVISION_REQUEST_TTL_MS,
      status: "pending",
    };
    cache[args.grantId] = request;
    await persist();
    return { ok: true as const, request };
  });
}

/** The open request for a grant, if there is one. */
export async function getProvisionRequest(
  grantId: string,
  now: number = Date.now(),
): Promise<ProxyShareProvisionRequest | undefined> {
  await ensureLoaded({ force: true });
  const request = cache[grantId];
  if (!request || !isProvisionRequestOpen(request, now)) {
    return undefined;
  }
  return request;
}

/** Every open request, for a lender deciding which to authorize. */
export async function listProvisionRequests(
  now: number = Date.now(),
): Promise<ProxyShareProvisionRequest[]> {
  await ensureLoaded({ force: true });
  return Object.values(cache).filter((request) =>
    isProvisionRequestOpen(request, now),
  );
}

/**
 * Attach the authorization code the lender's browser produced.
 *
 * The code is bound to the grant that asked for it and to the account the lender
 * authorized against — the same account the drift audit will later reconcile —
 * so a code cannot be redirected to a different grant after the fact.
 */
export async function authorizeProvisionRequest(args: {
  grantId: string;
  code: string;
  accountLabel?: string;
  now?: number;
}): Promise<ProxyShareProvisionOutcome> {
  const now = args.now ?? Date.now();
  const code = args.code.trim();
  if (!code) {
    return { ok: false, reason: "no authorization code" };
  }
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const request = cache[args.grantId];
    if (!request) {
      return { ok: false as const, reason: "no provisioning request" };
    }
    if (!isProvisionRequestOpen(request, now)) {
      return { ok: false as const, reason: "the request has expired" };
    }
    const authorized: ProxyShareProvisionRequest = {
      ...request,
      status: "authorized",
      code,
      authorizedAt: now,
      ...(args.accountLabel ? { accountLabel: args.accountLabel } : {}),
    };
    cache[args.grantId] = authorized;
    await persist();
    return { ok: true as const, request: authorized };
  });
}

/**
 * Hand the code to the borrower — once.
 *
 * Single-use is the whole binding: an authorization code that could be claimed
 * twice would let anyone who replayed the call mint a second credential on the
 * lender's account. Consumption is recorded before the value is returned.
 */
export async function claimProvisionRequest(
  grantId: string,
  now: number = Date.now(),
): Promise<
  | { status: "ready"; code: string; state: string }
  | { status: "pending" }
  | { status: "none" }
> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const request = cache[grantId];
    if (!request || !isProvisionRequestOpen(request, now)) {
      return { status: "none" as const };
    }
    if (request.status !== "authorized" || !request.code) {
      return { status: "pending" as const };
    }
    // Drop the code rather than carrying it through the spread: it has been
    // handed over, it is single-use, and `persist()` would otherwise write a
    // live authorization code to disk for the life of the record.
    const { code: _claimed, ...spent } = request;
    cache[grantId] = { ...spent, status: "consumed", claimedAt: now };
    await persist();
    return {
      status: "ready" as const,
      code: request.code,
      state: request.state,
    };
  });
}

/** Drop a grant's request — used when the grant itself goes away. */
export async function clearProvisionRequest(grantId: string): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    if (cache[grantId]) {
      delete cache[grantId];
      await persist();
    }
  });
}

/**
 * A state value for a borrower to send alongside its challenge.
 *
 * Kept here so both ends agree on the shape `STATE_PATTERN` will accept.
 */
export function generateProvisionState(): string {
  return randomBytes(24).toString("base64url");
}
