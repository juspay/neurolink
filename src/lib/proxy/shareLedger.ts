/**
 * NeuroCoin ledger and per-window consumption tracking for borrowed traffic.
 *
 * Two jobs, deliberately in one module because they settle from the same event:
 *
 * 1. **Coins.** A grant with a coin entitlement spends against a balance. The
 *    balance itself lives on the grant (one source of truth); this module holds
 *    the entries and drives the deduction.
 * 2. **Window buckets.** How much of an account's 5h/7d window a grant has taken,
 *    keyed by that window's reset timestamp so the counter starts fresh when the
 *    window does. This is what makes a slice ceiling mean "a fifth of *this*
 *    window" rather than "a fifth, once, forever".
 *
 * **Why hold-then-settle.** Real usage is only known when the response finishes
 * — for a stream, at `message_delta`. A balance checked at admission and
 * deducted at completion lets N concurrent streams each pass the same check and
 * overspend by N-1 requests. So admission opens a *hold* for an estimate, the
 * available balance is `balance - Σ open holds`, and settlement replaces the
 * hold with the real figure. A crash loses in-flight holds, which is the safe
 * direction: the balance is only ever reduced by traffic that actually happened.
 *
 * @module proxy/shareLedger
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareGrant,
  ProxyShareGrantUsageSummary,
  ProxyShareHold,
  ProxyShareLedgerBucket,
  ProxyShareLedgerFile,
  ProxySharePoolUsage,
  ProxyShareSettlement,
  ProxyShareUsage,
  ProxyShareWindowObservation,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import { debitShareGrantCoins, updateShareGrant } from "./shareGrants.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";

const LEDGER_FILE = "proxy-share-ledger.json";

/** Normalized tokens per coin. */
export const TOKENS_PER_COIN = 1000;

/**
 * Output tokens cost materially more than input everywhere, and cache reads
 * cost almost nothing. Weighting by that keeps a coin comparable across very
 * different request shapes rather than rewarding one long prompt over many
 * short ones.
 */
const INPUT_WEIGHT = 1;
const OUTPUT_WEIGHT = 4;
const CACHE_CREATE_WEIGHT = 1.25;
const CACHE_READ_WEIGHT = 0.1;

/** Tier multipliers, mirroring the published price ratios. */
const MODEL_WEIGHTS: ReadonlyArray<[string, number]> = [
  ["haiku", 0.25],
  ["sonnet", 1],
  ["opus", 5],
  ["fable", 5],
];

let customLedgerFilePath: string | null = null;
let buckets: Record<string, ProxyShareLedgerBucket> = {};
let loaded = false;
const mutationMutex = new AsyncMutex();

/** Open holds, in memory only — they are request-scoped by definition. */
const holds = new Map<string, ProxyShareHold>();

export function initShareLedger(ledgerFilePath: string): void {
  customLedgerFilePath = ledgerFilePath;
  buckets = {};
  loaded = false;
  holds.clear();
}

function getLedgerFilePath(): string {
  return customLedgerFilePath ?? join(homedir(), ".neurolink", LEDGER_FILE);
}

function bucketKey(grantId: string, accountKey: string): string {
  return `${grantId}|${accountKey}`;
}

export function modelCoinWeight(model: string | undefined): number {
  if (!model) {
    return 1;
  }
  const normalized = model.toLowerCase();
  for (const [token, weight] of MODEL_WEIGHTS) {
    if (normalized.includes(token)) {
      return weight;
    }
  }
  return 1;
}

/** Convert real usage into coins. Pure — the pricing table is the whole story. */
export function usageToCoins(
  usage: ProxyShareUsage,
  model: string | undefined,
): number {
  const normalized =
    usage.inputTokens * INPUT_WEIGHT +
    usage.outputTokens * OUTPUT_WEIGHT +
    (usage.cacheCreationTokens ?? 0) * CACHE_CREATE_WEIGHT +
    (usage.cacheReadTokens ?? 0) * CACHE_READ_WEIGHT;
  return (normalized * modelCoinWeight(model)) / TOKENS_PER_COIN;
}

/**
 * What to hold at admission, before anything is known about the response.
 *
 * Intentionally rough: the hold exists to stop concurrent streams from each
 * spending the last coin, not to predict the bill. Settlement replaces it with
 * the real figure moments later.
 */
export function estimateHoldCoins(
  model: string | undefined,
  maxTokens: number | undefined,
): number {
  const assumedOutput = Math.min(Math.max(maxTokens ?? 4096, 256), 64_000);
  return usageToCoins(
    { inputTokens: 2000, outputTokens: assumedOutput },
    model,
  );
}

function isBucket(value: unknown): value is ProxyShareLedgerBucket {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ProxyShareLedgerBucket>;
  return (
    typeof candidate.grantId === "string" &&
    typeof candidate.accountKey === "string" &&
    typeof candidate.sessionFraction === "number" &&
    typeof candidate.weeklyFraction === "number"
  );
}

async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(getLedgerFilePath(), "utf8"),
    ) as Partial<ProxyShareLedgerFile>;
    buckets = Object.fromEntries(
      Object.entries(parsed?.buckets ?? {}).filter(
        (entry): entry is [string, ProxyShareLedgerBucket] =>
          isBucket(entry[1]),
      ),
    );
  } catch {
    buckets = {};
  }
  loaded = true;
}

async function persist(): Promise<void> {
  const file: ProxyShareLedgerFile = { schemaVersion: 1, buckets };
  await writeJsonSnapshotAtomically(getLedgerFilePath(), file);
}

/** Coins currently held against a grant by in-flight requests. */
export function heldCoins(grantId: string): number {
  let total = 0;
  for (const hold of holds.values()) {
    if (hold.grantId === grantId) {
      total += hold.coins;
    }
  }
  return total;
}

/**
 * Balance a new request may draw on: the stored balance minus what in-flight
 * requests have already claimed.
 */
export function availableCoins(grant: ProxyShareGrant): number {
  if (grant.entitlement.ledger !== "coins") {
    return Number.POSITIVE_INFINITY;
  }
  return (grant.entitlement.coins ?? 0) - heldCoins(grant.id);
}

export function openShareHold(
  grantId: string,
  coins: number,
  now: number = Date.now(),
): ProxyShareHold {
  const hold: ProxyShareHold = {
    id: randomUUID(),
    grantId,
    coins: Math.max(0, coins),
    openedAt: now,
  };
  holds.set(hold.id, hold);
  return hold;
}

/** Drop a hold without spending it — the request never reached the upstream. */
export function releaseShareHold(holdId: string | undefined): void {
  if (holdId) {
    holds.delete(holdId);
  }
}

/**
 * Fold a utilization observation into a bucket.
 *
 * A reset timestamp that moved means the window rolled over, so the accumulated
 * fraction is discarded rather than carried into a window it does not describe.
 * A negative delta (the reset raced the response) is clamped to zero.
 */
function applyWindowDelta(
  bucket: ProxyShareLedgerBucket,
  settlement: ProxyShareWindowObservation,
): void {
  const sessionReset = settlement.sessionResetAt ?? null;
  if (sessionReset !== bucket.sessionResetAt) {
    bucket.sessionResetAt = sessionReset;
    bucket.sessionFraction = 0;
  }
  const weeklyReset = settlement.weeklyResetAt ?? null;
  if (weeklyReset !== bucket.weeklyResetAt) {
    bucket.weeklyResetAt = weeklyReset;
    bucket.weeklyFraction = 0;
  }

  if (
    settlement.sessionBefore !== null &&
    settlement.sessionBefore !== undefined &&
    settlement.sessionAfter !== null &&
    settlement.sessionAfter !== undefined
  ) {
    bucket.sessionFraction += Math.max(
      0,
      settlement.sessionAfter - settlement.sessionBefore,
    );
  }
  if (
    settlement.weeklyBefore !== null &&
    settlement.weeklyBefore !== undefined &&
    settlement.weeklyAfter !== null &&
    settlement.weeklyAfter !== undefined
  ) {
    bucket.weeklyFraction += Math.max(
      0,
      settlement.weeklyAfter - settlement.weeklyBefore,
    );
  }
}

function emptyBucket(
  grantId: string,
  accountKey: string,
  sessionResetAt: number | null,
  weeklyResetAt: number | null,
): ProxyShareLedgerBucket {
  return {
    grantId,
    accountKey,
    sessionResetAt,
    weeklyResetAt,
    sessionFraction: 0,
    weeklyFraction: 0,
    coinsSpent: 0,
    requests: 0,
    updatedAt: Date.now(),
  };
}

/**
 * Record how much of an account's windows a borrowed request consumed.
 *
 * Never throws: a bookkeeping failure must not turn a response the borrower has
 * already received into an error.
 */
export async function recordShareWindowDelta(
  observation: ProxyShareWindowObservation,
): Promise<void> {
  try {
    await mutationMutex.runExclusive(async () => {
      await ensureLoaded();
      const key = bucketKey(observation.grantId, observation.accountKey);
      const bucket =
        buckets[key] ??
        emptyBucket(
          observation.grantId,
          observation.accountKey,
          observation.sessionResetAt ?? null,
          observation.weeklyResetAt ?? null,
        );
      applyWindowDelta(bucket, observation);
      bucket.updatedAt = Date.now();
      buckets[key] = bucket;
      await persist();
    });
  } catch (error) {
    logger.always(
      `[proxy] share window bookkeeping failed for grant=${observation.grantId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Charge a finished borrowed request against its grant and close the hold.
 *
 * Never throws, for the same reason as above.
 */
export async function settleShareUsage(
  settlement: ProxyShareSettlement,
): Promise<number> {
  const coins = usageToCoins(settlement.usage, settlement.model);
  try {
    await mutationMutex.runExclusive(async () => {
      await ensureLoaded();
      const key = bucketKey(settlement.grantId, settlement.accountKey);
      const bucket =
        buckets[key] ??
        emptyBucket(settlement.grantId, settlement.accountKey, null, null);
      bucket.coinsSpent += coins;
      bucket.requests += 1;
      bucket.updatedAt = Date.now();
      buckets[key] = bucket;
      await persist();
    });

    // Deduction is read-modify-write under the grant store's own lock; doing it
    // here would race a concurrently settling stream and lose one of the two.
    const balanceAfter = await debitShareGrantCoins(settlement.grantId, coins);
    // The borrower's copy of this charge. Imported here rather than at the top
    // because receipts read the price table from this module, and a static
    // import both ways is a cycle.
    const { issueShareReceipt } = await import("./shareReceipts.js");
    await issueShareReceipt({
      grantId: settlement.grantId,
      coins,
      usage: settlement.usage,
      ...(settlement.model ? { model: settlement.model } : {}),
      balanceAfter: balanceAfter ?? null,
    });
  } catch (error) {
    logger.always(
      `[proxy] share settlement failed for grant=${settlement.grantId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    releaseShareHold(settlement.holdId);
  }
  return coins;
}

/**
 * What a grant has taken from one account's current windows.
 *
 * Buckets whose reset timestamp no longer matches the account's are reported as
 * zero: they describe a window that has since rolled over.
 */
export async function readShareWindowUsage(
  grantId: string,
  accountKey: string,
  currentSessionResetAt: number | null,
  currentWeeklyResetAt: number | null,
): Promise<{ sessionFraction: number; weeklyFraction: number }> {
  await ensureLoaded();
  const bucket = buckets[bucketKey(grantId, accountKey)];
  if (!bucket) {
    return { sessionFraction: 0, weeklyFraction: 0 };
  }
  return {
    sessionFraction:
      bucket.sessionResetAt === currentSessionResetAt
        ? bucket.sessionFraction
        : 0,
    weeklyFraction:
      bucket.weeklyResetAt === currentWeeklyResetAt ? bucket.weeklyFraction : 0,
  };
}

/**
 * What a grant has taken from the pool as a whole, normalised to one window.
 *
 * Summing the per-account fractions and dividing by the account count is what
 * makes a ceiling mean the same thing on a one-account pool and a ten-account
 * one. Without the division, `--max-slice 20` would silently grant 20% of every
 * credential — 200% of a single window's worth across ten accounts.
 *
 * Buckets whose reset timestamp no longer matches contribute zero: they
 * describe a window that has since rolled over.
 */
export async function readSharePoolWindowUsage(
  grantId: string,
  accounts: ReadonlyArray<{
    accountKey: string;
    sessionResetAt: number | null;
    weeklyResetAt: number | null;
  }>,
): Promise<ProxySharePoolUsage> {
  await ensureLoaded();
  if (accounts.length === 0) {
    return { sessionFraction: 0, weeklyFraction: 0 };
  }
  let session = 0;
  let weekly = 0;
  for (const account of accounts) {
    const bucket = buckets[bucketKey(grantId, account.accountKey)];
    if (!bucket) {
      continue;
    }
    if (bucket.sessionResetAt === account.sessionResetAt) {
      session += bucket.sessionFraction;
    }
    if (bucket.weeklyResetAt === account.weeklyResetAt) {
      weekly += bucket.weeklyFraction;
    }
  }
  return {
    sessionFraction: session / accounts.length,
    weeklyFraction: weekly / accounts.length,
  };
}

/** Per-grant rollup across accounts, for `share status`. */
export async function summarizeGrantUsage(
  grantId: string,
): Promise<ProxyShareGrantUsageSummary> {
  await ensureLoaded();
  let coinsSpent = 0;
  let requests = 0;
  let accounts = 0;
  let lastUsedAt: number | null = null;
  for (const bucket of Object.values(buckets)) {
    if (bucket.grantId !== grantId) {
      continue;
    }
    coinsSpent += bucket.coinsSpent;
    requests += bucket.requests;
    // A bucket exists as soon as a window movement is attributed, which happens
    // before settlement. Counting those would report accounts the grant merely
    // touched as accounts it drew on.
    if (bucket.requests > 0) {
      accounts += 1;
    }
    lastUsedAt = Math.max(lastUsedAt ?? 0, bucket.updatedAt) || null;
  }
  return { grantId, coinsSpent, requests, accounts, lastUsedAt };
}

/**
 * Most periods a single catch-up may pay out.
 *
 * A node that was off for a month owes the borrower the periods it missed, but a
 * clock that jumps — a VM restored from a snapshot, a corrected system time —
 * would otherwise mint an unbounded balance in one call.
 */
const MAX_REFILL_CATCHUP_PERIODS = 8;

/**
 * Apply a standing allowance for every period that has elapsed.
 *
 * Called opportunistically at admission — there is no timer, so a node that is
 * off across one or more refill boundaries pays them on its next borrowed
 * request. Paying only the newest period would quietly turn "100 a week" into
 * "100 whenever you next happen to ask", which is not what the operator wrote.
 *
 * `lastAt` advances by whole periods rather than to `now`, so the schedule stays
 * anchored to when the grant was issued instead of drifting later with every
 * catch-up. It advances past the periods the cap refused to pay as well — see
 * {@link MAX_REFILL_CATCHUP_PERIODS}.
 */
export async function applyRefillIfDue(
  grant: ProxyShareGrant,
  now: number = Date.now(),
): Promise<ProxyShareGrant> {
  const refill = grant.entitlement.refill;
  if (!refill || grant.entitlement.ledger !== "coins") {
    return grant;
  }
  const periodMs = refill.per === "week" ? 604_800_000 : 18_000_000;
  const lastAt = refill.lastAt ?? grant.createdAt;
  const elapsed = now - lastAt;
  if (elapsed < periodMs) {
    return grant;
  }
  const owed = Math.floor(elapsed / periodMs);
  const periods = Math.min(owed, MAX_REFILL_CATCHUP_PERIODS);
  // The cap forfeits the excess rather than carrying it. Advancing `lastAt` by
  // only what was paid would leave the same backlog waiting, and the next few
  // admissions would drain it a cap at a time — which is exactly the unbounded
  // mint the cap exists to prevent, just spread over more calls.
  if (owed > periods) {
    logger.always(
      `[proxy] grant ${grant.id} skipped ${owed - periods} refill periods — capped at ${MAX_REFILL_CATCHUP_PERIODS}`,
    );
  }
  const topped = (grant.entitlement.coins ?? 0) + refill.amount * periods;
  const updated = await updateShareGrant(grant.id, {
    entitlement: {
      ledger: "coins",
      coins: topped,
      refill: { ...refill, lastAt: lastAt + owed * periodMs },
    },
  });
  return updated ?? grant;
}

/** Drop all ledger state. Test isolation only. */
export function resetShareLedgerForTests(): void {
  buckets = {};
  loaded = false;
  holds.clear();
}
