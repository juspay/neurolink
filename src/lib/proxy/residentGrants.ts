/**
 * Credentials a lender provisioned onto this device, and the leases that keep
 * them legitimate.
 *
 * This is the borrower's half of **complete** sharing. The credential itself
 * lives in the normal token store and is routed like any other account — that is
 * the point, since it survives the lender being offline. What lives here is the
 * proof that the lender still consents, and the machinery to keep it fresh.
 *
 * **The enforcement is cooperative and the code should say so.** A resident
 * credential sits on a machine its holder controls, and the token store is
 * obfuscated rather than encrypted. Someone determined to bypass this can. What
 * these checks buy is that the honest path is also the correct one: a borrower
 * running the shipped software stops when the lender says stop, and stops on its
 * own if the lender becomes unreachable for longer than the lease allows.
 *
 * @module proxy/residentGrants
 */

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyResidentGrant,
  ProxyResidentGrantFile,
  ProxyShareHeartbeatRenewal,
  ProxyShareHeartbeatResponse,
  ProxyShareHeartbeatStop,
  ProxyShareLease,
  ProxyShareLeaseVerdict,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import {
  evaluateLease,
  isHeartbeatDue,
  isLeaseAuthentic,
} from "./shareLease.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const RESIDENT_FILE = "proxy-resident-grants.json";
const HEARTBEAT_TIMEOUT_MS = 10_000;

/**
 * How long a read may trust the cache before it stats the file again.
 *
 * The CLI writes this file from a separate process — `share accept`, `peer
 * provision`, a manual removal — so a load-once cache would let a long-lived
 * proxy keep serving from a grant the operator revoked minutes ago.
 */
const RELOAD_TTL_MS = 1_000;

let customFilePath: string | null = null;
let cache: Record<string, ProxyResidentGrant> = {};
let cacheLoadedAt = 0;
let cacheMtimeMs = -1;
let cacheValid = false;
const mutationMutex = new AsyncMutex();

export function initResidentGrants(filePath: string): void {
  customFilePath = filePath;
  cache = {};
  cacheLoadedAt = 0;
  cacheMtimeMs = -1;
  cacheValid = false;
}

function getFilePath(): string {
  return customFilePath ?? join(homedir(), ".neurolink", RESIDENT_FILE);
}

function isResidentGrant(value: unknown): value is ProxyResidentGrant {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyResidentGrant>;
  return (
    typeof candidate.accountLabel === "string" &&
    typeof candidate.grantId === "string" &&
    typeof candidate.leaseSecret === "string" &&
    !!candidate.lease
  );
}

/**
 * Is this error simply "the file is not there yet"?
 *
 * The distinction is load-bearing. An absent file genuinely is an empty map —
 * nothing has been written yet. Every *other* `stat`/read failure (`EACCES`,
 * `EIO`, `EMFILE`, a full descriptor table) is a failure to observe the file,
 * and answering one with an empty map is how a whole store gets erased: a
 * caller passing `force` is about to `persist()` the map back over the real
 * contents it just failed to read.
 */
function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
  const now = Date.now();
  if (!options.force && cacheValid && now - cacheLoadedAt < RELOAD_TTL_MS) {
    return;
  }
  const path = getFilePath();
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(path)).mtimeMs;
  } catch (error) {
    if (!isMissingFileError(error)) {
      // Not "no file" but "could not look" — see `isMissingFileError`. Let it
      // out: a mutation must abort rather than persist an empty map over a
      // store it never managed to read.
      throw error;
    }
    cache = {};
    cacheMtimeMs = -1;
    cacheLoadedAt = now;
    cacheValid = true;
    return;
  }
  // A forced load skips this. mtime is the fast path for a read, not a
  // correctness check for a write: several filesystems stamp it at one-second
  // granularity, so a write landing in the same second as our last read is
  // indistinguishable from no write at all — and every caller passing `force`
  // is about to persist the whole map back over whatever it missed.
  if (!options.force && cacheValid && mtimeMs === cacheMtimeMs) {
    cacheLoadedAt = now;
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(path, "utf8"),
    ) as Partial<ProxyResidentGrantFile>;
    cache = Object.fromEntries(
      Object.entries(parsed?.grants ?? {}).filter(
        (entry): entry is [string, ProxyResidentGrant] =>
          isResidentGrant(entry[1]),
      ),
    );
  } catch (error) {
    if (options.force) {
      // A mutation is about to write the whole map back; treating a corrupt
      // file as empty here would make that write finish the corruption off.
      // Abort instead and leave the file for a human. Reads stay tolerant.
      throw error;
    }
    cache = {};
  }
  cacheMtimeMs = mtimeMs;
  cacheLoadedAt = now;
  cacheValid = true;
}

async function persist(): Promise<void> {
  const file: ProxyResidentGrantFile = { schemaVersion: 1, grants: cache };
  await writeJsonSnapshotAtomically(getFilePath(), file);
  try {
    cacheMtimeMs = (await stat(getFilePath())).mtimeMs;
  } catch {
    cacheMtimeMs = -1;
  }
  cacheLoadedAt = Date.now();
  cacheValid = true;
}

/**
 * Narrow a heartbeat answer to its stopping half.
 * Explicit because one build step compiles without `strictNullChecks`, where a
 * boolean discriminant does not narrow.
 */
function isHeartbeatStop(
  payload: ProxyShareHeartbeatResponse,
): payload is ProxyShareHeartbeatStop {
  return !payload.ok;
}

/**
 * Is this shaped like a lease at all?
 *
 * Shape only — {@link isLeaseAuthentic} decides whether it is *ours*. Both run
 * before a renewal is allowed to replace a lease that currently works, because
 * the answer comes off the wire and an `{ ok: true }` with no usable lease
 * would otherwise be persisted over the one keeping this account alive.
 */
function isShareLease(value: unknown): value is ProxyShareLease {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyShareLease>;
  return (
    typeof candidate.grantId === "string" &&
    typeof candidate.signature === "string" &&
    typeof candidate.issuedAt === "number" &&
    typeof candidate.notAfter === "number" &&
    typeof candidate.heartbeatEveryMs === "number" &&
    typeof candidate.offlineGraceMs === "number" &&
    !!candidate.gates
  );
}

/** The matching predicate for the renewing half. */
function isHeartbeatRenewal(
  payload: ProxyShareHeartbeatResponse,
): payload is ProxyShareHeartbeatRenewal {
  return payload.ok === true && isShareLease(payload.lease);
}

/** Key by the account label, since that is how the routing path addresses it. */
function keyFor(accountLabel: string): string {
  return accountLabel.toLowerCase();
}

export async function listResidentGrants(): Promise<ProxyResidentGrant[]> {
  await ensureLoaded();
  return Object.values(cache);
}

export async function getResidentGrantForAccount(
  accountKeyOrLabel: string,
): Promise<ProxyResidentGrant | undefined> {
  await ensureLoaded();
  const value = accountKeyOrLabel.toLowerCase();
  const label = value.includes(":")
    ? value.slice(value.indexOf(":") + 1)
    : value;
  return cache[keyFor(label)];
}

export async function saveResidentGrant(
  grant: ProxyResidentGrant,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a grant the CLI removed in the window
    // since this process last read the file.
    await ensureLoaded({ force: true });
    cache[keyFor(grant.accountLabel)] = grant;
    await persist();
  });
}

export async function removeResidentGrant(
  accountLabel: string,
): Promise<boolean> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = keyFor(accountLabel);
    if (!cache[key]) {
      return false;
    }
    delete cache[key];
    await persist();
    return true;
  });
}

/**
 * May this resident account serve right now?
 *
 * Returns `undefined` for an account that is not resident at all — the node's
 * own credentials, which answer to nobody.
 */
export async function evaluateResidentAccount(
  accountKeyOrLabel: string,
  now: number = Date.now(),
): Promise<ProxyShareLeaseVerdict | undefined> {
  const resident = await getResidentGrantForAccount(accountKeyOrLabel);
  if (!resident) {
    return undefined;
  }
  return evaluateLease({
    lease: resident.lease,
    secret: resident.leaseSecret,
    ...(resident.lastHeartbeatAt !== undefined
      ? { lastHeartbeatAt: resident.lastHeartbeatAt }
      : {}),
    now,
  });
}

/** Accumulate spend the borrower owes the lender an account of. */
export async function recordResidentSpend(
  accountLabel: string,
  coins: number,
): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = keyFor(accountLabel);
    const resident = cache[key];
    if (!resident) {
      return;
    }
    cache[key] = {
      ...resident,
      unreportedCoins: (resident.unreportedCoins ?? 0) + coins,
      unreportedRequests: (resident.unreportedRequests ?? 0) + 1,
    };
    await persist();
  });
}

/**
 * Apply a heartbeat's outcome to whatever the record says **now**.
 *
 * The round trip takes up to {@link HEARTBEAT_TIMEOUT_MS} and requests keep
 * being served throughout it, so writing back the snapshot the heartbeat
 * started from would silently drop every coin {@link recordResidentSpend}
 * booked in that window. The reported amounts are subtracted from the current
 * counters instead of the counters being zeroed, and the record is re-read
 * rather than reconstructed from the caller's copy.
 */
async function settleHeartbeat(args: {
  accountLabel: string;
  reportedCoins: number;
  reportedRequests: number;
  /** The renewed lease, or `"stop"` to expire whichever lease is current. */
  outcome: { lease: ProxyShareLease } | "stop";
  now: number;
}): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const key = keyFor(args.accountLabel);
    const current = cache[key];
    if (!current) {
      return;
    }
    cache[key] = {
      ...current,
      lease:
        args.outcome === "stop"
          ? // Force the next evaluation to fail closed without waiting out grace.
            { ...current.lease, notAfter: args.now }
          : args.outcome.lease,
      lastHeartbeatAt: args.now,
      unreportedCoins: Math.max(
        0,
        (current.unreportedCoins ?? 0) - args.reportedCoins,
      ),
      unreportedRequests: Math.max(
        0,
        (current.unreportedRequests ?? 0) - args.reportedRequests,
      ),
    };
    await persist();
  });
}

/**
 * Check in with a lender: report what was spent, collect a fresh lease.
 *
 * Reporting happens **before** the new lease is stored, and the counters are
 * only drawn down once the lender has acknowledged them — a heartbeat that
 * fails halfway leaves the spend to be reported again rather than losing it.
 *
 * A `stop` answer is honored immediately by clearing the lease's grace: the
 * lender has said no, and there is nothing to wait out.
 */
export async function heartbeatResidentGrant(
  resident: ProxyResidentGrant,
  now: number = Date.now(),
): Promise<{ ok: boolean; stopped: boolean; detail: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
  // Exactly what this round trip claims to have reported, so the settle can
  // subtract that and nothing more.
  const reportedCoins = resident.unreportedCoins ?? 0;
  const reportedRequests = resident.unreportedRequests ?? 0;
  try {
    const response = await fetch(`${resident.lenderUrl}/peer/heartbeat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": resident.leaseSecret,
        "x-neurolink-grant-id": resident.grantId,
      },
      body: JSON.stringify({
        grantId: resident.grantId,
        coinsSpent: reportedCoins,
        requests: reportedRequests,
        reportedAt: now,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        stopped: false,
        detail: `lender answered ${response.status}`,
      };
    }

    const payload = (await response.json()) as ProxyShareHeartbeatResponse;
    if (isHeartbeatStop(payload)) {
      await settleHeartbeat({
        accountLabel: resident.accountLabel,
        reportedCoins,
        reportedRequests,
        outcome: "stop",
        now,
      });
      logger.always(
        `[proxy] lender stopped resident grant ${resident.accountLabel}: ${payload.reason}`,
      );
      return { ok: true, stopped: true, detail: payload.reason };
    }

    if (!isHeartbeatRenewal(payload)) {
      return {
        ok: false,
        stopped: false,
        detail: "lender answered with neither a lease nor a stop",
      };
    }
    // A renewal that is not signed by the secret we already hold, or that is
    // for some other grant, is not a renewal — keep the working lease and let
    // the offline grace run. Replacing it would hand any party that can answer
    // this request the ability to revoke us, or to extend us indefinitely.
    if (payload.lease.grantId !== resident.grantId) {
      return {
        ok: false,
        stopped: false,
        detail: "renewed lease is for a different grant",
      };
    }
    if (!isLeaseAuthentic(payload.lease, resident.leaseSecret)) {
      return {
        ok: false,
        stopped: false,
        detail: "renewed lease is not signed by the lender's secret",
      };
    }
    await settleHeartbeat({
      accountLabel: resident.accountLabel,
      reportedCoins,
      reportedRequests,
      outcome: { lease: payload.lease },
      now,
    });
    return { ok: true, stopped: false, detail: "lease renewed" };
  } catch (error) {
    return {
      ok: false,
      stopped: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check in with every lender whose heartbeat is due.
 *
 * Best-effort by design: a lender being unreachable is the case the offline
 * grace exists for, not an error to surface.
 */
export async function heartbeatDueResidentGrants(
  now: number = Date.now(),
): Promise<void> {
  const grants = await listResidentGrants();
  for (const resident of grants) {
    if (!isHeartbeatDue(resident.lease, resident.lastHeartbeatAt, now)) {
      continue;
    }
    const result = await heartbeatResidentGrant(resident, now);
    if (!result.ok) {
      logger.debug(
        `[proxy] heartbeat to ${resident.lenderName} failed: ${result.detail}`,
      );
    }
  }
}

/** The lease a resident account is currently operating under. */
export function residentLease(resident: ProxyResidentGrant): ProxyShareLease {
  return resident.lease;
}
