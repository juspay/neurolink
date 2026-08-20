/**
 * Trust-but-verify for complete-mode shares.
 *
 * A complete-mode borrower calls the provider directly, so the lender never sees
 * its requests and its reported spend is, strictly, an assertion. This module is
 * what stops that assertion from being the only evidence.
 *
 * **The signal.** The provider reports the account's own utilization, and the
 * borrower cannot influence that number. If an account's window moved between
 * two heartbeats, someone spent it. If the lender's own node served nothing on
 * that account in the same interval, and the borrower reported nothing either,
 * then something consumed the account that neither party is accounting for —
 * which is exactly the shape of a borrower that stopped reporting.
 *
 * **Why it is conservative.** The check only fires when the lender's own traffic
 * on that account was zero for the interval. A busy lender moves the same
 * numbers, and a false accusation is worse than a missed one: the remedy here is
 * to pause someone's access. Everything ambiguous is reported as `attributable`
 * and left alone.
 *
 * This detects a borrower that under-reports. It does not, and cannot, detect
 * one that reports honestly and simply spends what it was lent. It is also blind
 * across a window reset: utilization that falls between two check-ins reads as
 * no movement, so spend timed around a rollover goes unremarked. Closing that
 * would mean trusting a reset timestamp the borrower also influences, which is
 * a worse trade than the gap.
 *
 * @module proxy/shareAudit
 */

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareAuditFile,
  ProxyShareAuditObservation,
  ProxyShareAuditRecord,
  ProxyShareDriftVerdict,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const AUDIT_FILE = "proxy-share-audit.json";

/**
 * How much of a window may move unexplained before it counts as drift.
 *
 * Utilization is reported coarsely and can tick from rounding or from a request
 * that was in flight across the boundary, so a hair-trigger would cry wolf.
 */
export const DRIFT_TOLERANCE_PCT = 2;

/** Consecutive drifting heartbeats tolerated before the grant is paused. */
export const DRIFT_STREAK_LIMIT = 3;

/**
 * How long a read may trust the cache before it stats the file again.
 *
 * The CLI reads and clears this trail from a separate process (`share audit`,
 * `share resume`), so a load-once cache would let the proxy keep counting a
 * drift streak an operator already cleared.
 */
const RELOAD_TTL_MS = 1_000;

let customAuditFilePath: string | null = null;
let cache: Record<string, ProxyShareAuditRecord> = {};
let cacheLoadedAt = 0;
let cacheMtimeMs = -1;
let cacheValid = false;
const mutationMutex = new AsyncMutex();

export function initShareAudit(auditFilePath: string): void {
  customAuditFilePath = auditFilePath;
  cache = {};
  cacheLoadedAt = 0;
  cacheMtimeMs = -1;
  cacheValid = false;
}

function getAuditFilePath(): string {
  return customAuditFilePath ?? join(homedir(), ".neurolink", AUDIT_FILE);
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
  const path = getAuditFilePath();
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
    ) as Partial<ProxyShareAuditFile>;
    cache = parsed?.records ?? {};
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
  const file: ProxyShareAuditFile = { schemaVersion: 1, records: cache };
  await writeJsonSnapshotAtomically(getAuditFilePath(), file);
  try {
    cacheMtimeMs = (await stat(getAuditFilePath())).mtimeMs;
  } catch {
    cacheMtimeMs = -1;
  }
  cacheLoadedAt = Date.now();
  cacheValid = true;
}

/** Utilization movement between two observations, in whole percent. */
function movementPct(before: number | null, after: number | null): number {
  if (before === null || after === null) {
    return 0;
  }
  return Math.max(0, (after - before) * 100);
}

/**
 * Compare one heartbeat against the account's real movement.
 *
 * Pure: the caller supplies the previous observation and the current one, so the
 * decision is inspectable and testable without any I/O.
 */
export function evaluateDrift(
  previous: ProxyShareAuditObservation | undefined,
  current: ProxyShareAuditObservation,
  tolerancePct: number = DRIFT_TOLERANCE_PCT,
): ProxyShareDriftVerdict {
  if (!previous) {
    return { drifted: false, reason: "no_baseline" };
  }
  // The lender's own traffic moves the same windows. With no way to split the
  // two apart, an interval the lender also used is not evidence of anything.
  if (current.lenderRequests > 0) {
    return { drifted: false, reason: "attributable" };
  }
  const sessionMoved = movementPct(previous.sessionUsed, current.sessionUsed);
  const weeklyMoved = movementPct(previous.weeklyUsed, current.weeklyUsed);
  const moved = Math.max(sessionMoved, weeklyMoved);
  if (moved <= tolerancePct) {
    return { drifted: false, reason: "quiet" };
  }
  if (current.reportedCoins > 0) {
    // The borrower owned up to spending. Whether the amount is exactly right is
    // not knowable from utilization alone, and guessing would invent precision.
    return { drifted: false, reason: "attributable" };
  }
  return {
    drifted: true,
    unexplainedSessionPct: sessionMoved,
    unexplainedWeeklyPct: weeklyMoved,
    detail:
      `the account moved ${moved.toFixed(1)}% of a window since the last check-in ` +
      `while this node served none of it and the borrower reported no spend`,
  };
}

export async function getAuditRecord(
  grantId: string,
): Promise<ProxyShareAuditRecord | undefined> {
  await ensureLoaded();
  return cache[grantId];
}

export async function listAuditRecords(): Promise<ProxyShareAuditRecord[]> {
  await ensureLoaded();
  return Object.values(cache);
}

/**
 * Fold a heartbeat into the audit trail.
 *
 * Returns whether the grant has now drifted past tolerance often enough to be
 * paused — the caller owns that decision, because pausing is a policy action and
 * this module only supplies evidence.
 */
export async function recordAuditObservation(args: {
  grantId: string;
  accountLabel: string;
  observation: ProxyShareAuditObservation;
  /** Lifetime lender-served request count, differenced against the stored
   *  total to yield this interval's `lenderRequests`. */
  lenderRequestsTotal?: number;
  streakLimit?: number;
  tolerancePct?: number;
}): Promise<{ verdict: ProxyShareDriftVerdict; shouldPause: boolean }> {
  const limit = args.streakLimit ?? DRIFT_STREAK_LIMIT;
  return mutationMutex.runExclusive(async () => {
    // Force: `persist()` writes the whole map back, so a mutation that ran on a
    // TTL-fresh snapshot would resurrect a record the CLI cleared in the window
    // since this process last read the file.
    await ensureLoaded({ force: true });
    const existing = cache[args.grantId];
    // Difference the lifetime counter here so callers can hand over the raw
    // total; an observation always carries the per-interval delta.
    const observation: ProxyShareAuditObservation =
      args.lenderRequestsTotal === undefined
        ? args.observation
        : {
            ...args.observation,
            lenderRequests: Math.max(
              0,
              args.lenderRequestsTotal - (existing?.lenderRequestsTotal ?? 0),
            ),
          };
    const verdict = evaluateDrift(
      existing?.lastObservation,
      observation,
      args.tolerancePct,
    );
    const streak = verdict.drifted ? (existing?.driftStreak ?? 0) + 1 : 0;
    const record: ProxyShareAuditRecord = {
      grantId: args.grantId,
      accountLabel: args.accountLabel,
      lastObservation: observation,
      ...(args.lenderRequestsTotal !== undefined
        ? { lenderRequestsTotal: args.lenderRequestsTotal }
        : existing?.lenderRequestsTotal !== undefined
          ? { lenderRequestsTotal: existing.lenderRequestsTotal }
          : {}),
      driftStreak: streak,
      ...(verdict.drifted
        ? { lastDriftAt: observation.at, lastDriftDetail: verdict.detail }
        : {
            ...(existing?.lastDriftAt !== undefined
              ? { lastDriftAt: existing.lastDriftAt }
              : {}),
            ...(existing?.lastDriftDetail !== undefined
              ? { lastDriftDetail: existing.lastDriftDetail }
              : {}),
          }),
      ...(existing?.autoPausedAt !== undefined
        ? { autoPausedAt: existing.autoPausedAt }
        : {}),
    };
    const shouldPause = streak >= limit && record.autoPausedAt === undefined;
    if (shouldPause) {
      record.autoPausedAt = observation.at;
    }
    cache[args.grantId] = record;
    await persist();
    return { verdict, shouldPause };
  });
}

/**
 * Clear a grant's drift streak and its auto-pause marker.
 *
 * Called when the lender resumes a grant. Without it the marker is permanent
 * and `shouldPause` can never fire again, so a grant auto-paused once would
 * drift freely for the rest of its life. The observation baseline is kept: it
 * is the account's real utilization and is still the right thing to difference
 * the next heartbeat against.
 */
export async function clearAuditDrift(grantId: string): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    const record = cache[grantId];
    if (!record) {
      return;
    }
    const { autoPausedAt: _autoPausedAt, ...rest } = record;
    cache[grantId] = { ...rest, driftStreak: 0 };
    await persist();
  });
}

/** Forget a grant's audit trail — used when the grant itself is deleted. */
export async function clearAuditRecord(grantId: string): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    if (cache[grantId]) {
      delete cache[grantId];
      await persist();
    }
  });
}
