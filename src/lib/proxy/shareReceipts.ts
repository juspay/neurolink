/**
 * Receipts, and the reciprocal netting built on them.
 *
 * **The problem receipts solve.** Until now the lender's word was the only
 * record of what a borrowed request cost. The lender settles from usage the
 * borrower never sees a ledger of, and a complete-mode borrower self-reports
 * spend the lender cannot see at all. Each side simply believed the other.
 *
 * A receipt is the lender's signed statement that one request was settled, for
 * how much, and against what usage. It travels with the usage block, so the
 * borrower does not have to accept the coin figure — it recomputes the charge
 * from the response it actually received and compares. `sequence` is contiguous
 * per grant, so a receipt withheld to hide a charge leaves a hole.
 *
 * What it cannot do: an HMAC proves authorship only to the holder of the key, so
 * a receipt settles a dispute *between the two parties to it* and is worth
 * nothing to a third. That is the deliberate trade — see `shareSigning.ts`.
 *
 * **Netting.** Two nodes that lend to each other otherwise accumulate two
 * one-way debts that never meet. Netting forgives the overlap: if a borrower has
 * consumed 300 coins of mine and I have consumed 500 of theirs, 300 cancels on
 * both sides. It is expressed in *cumulative* totals rather than deltas, so a
 * replayed or duplicated round nets zero rather than paying twice.
 *
 * @module proxy/shareReceipts
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ProxyShareNettingResult,
  ProxyShareReceipt,
  ProxyShareReceiptFile,
  ProxyShareStatement,
  ProxyShareUsage,
} from "../types/index.js";
import { AsyncMutex } from "../utils/asyncMutex.js";
import { logger } from "../utils/logger.js";
import { signSharePayload, verifySharePayload } from "./shareSigning.js";
import { usageToCoins } from "./shareLedger.js";
import { creditShareGrantCoins, getShareGrant } from "./shareGrants.js";

const RECEIPTS_FILE = "proxy-share-receipts.json";

/**
 * Receipts kept per grant.
 *
 * Enough that a borrower checking in daily never misses one, bounded so a busy
 * grant cannot grow the file without limit. A borrower that falls further behind
 * than this sees a gap, which is the honest answer — the alternative is silently
 * dropping the evidence and reporting a clean run.
 */
export const RECEIPT_HISTORY_LIMIT = 500;

let customFilePath: string | null = null;
let receipts: Record<string, ProxyShareReceipt[]> = {};
let netted: Record<string, number> = {};
/**
 * Lifetime coins and highest sequence per grant.
 *
 * Both exist because `receipts` is trimmed to {@link RECEIPT_HISTORY_LIMIT}.
 * Deriving either from the retained history is correct only until the first
 * trim, after which a busy grant's cumulative position silently resets — which
 * on the netting path would forgive coins that were already forgiven, and on
 * the issuing path would reuse sequence numbers the borrower has already seen.
 */
let consumedTotal: Record<string, number> = {};
let highestSequence: Record<string, number> = {};
let loaded = false;
const mutationMutex = new AsyncMutex();

export function initShareReceipts(filePath: string): void {
  customFilePath = filePath;
  receipts = {};
  netted = {};
  consumedTotal = {};
  highestSequence = {};
  loaded = false;
}

function getFilePath(): string {
  return customFilePath ?? join(homedir(), ".neurolink", RECEIPTS_FILE);
}

async function ensureLoaded(options: { force?: boolean } = {}): Promise<void> {
  if (loaded && !options.force) {
    return;
  }
  try {
    const parsed = JSON.parse(
      await readFile(getFilePath(), "utf8"),
    ) as Partial<ProxyShareReceiptFile>;
    receipts = parsed?.receipts ?? {};
    netted = parsed?.netted ?? {};
    // A file written before these were tracked carries neither. Seeding them
    // from the retained history is the best available answer and is exact for
    // any grant that has not yet been trimmed.
    consumedTotal =
      parsed?.consumedTotal ??
      seedFromHistory((sum, receipt) => sum + receipt.coins);
    highestSequence =
      parsed?.highestSequence ??
      seedFromHistory((top, receipt) => Math.max(top, receipt.sequence));
  } catch {
    receipts = {};
    netted = {};
    consumedTotal = {};
    highestSequence = {};
  }
  loaded = true;
}

/** Rebuild a per-grant total from whatever history survived trimming. */
function seedFromHistory(
  fold: (carried: number, receipt: ProxyShareReceipt) => number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(receipts).map(([grantId, history]) => [
      grantId,
      history.reduce(fold, 0),
    ]),
  );
}

async function persist(): Promise<void> {
  const { writeJsonSnapshotAtomically } =
    await import("./snapshotPersistence.js");
  const file: ProxyShareReceiptFile = {
    schemaVersion: 1,
    receipts,
    netted,
    consumedTotal,
    highestSequence,
  };
  await writeJsonSnapshotAtomically(getFilePath(), file);
}

/** Everything the signature covers — the receipt minus the signature itself. */
function receiptPayload(
  receipt: Omit<ProxyShareReceipt, "signature">,
): Omit<ProxyShareReceipt, "signature"> {
  return receipt;
}

/**
 * Record and sign a settlement.
 *
 * Never throws: a receipt that could not be written must not turn a response the
 * borrower already has into an error. A grant with no receipt secret — one
 * issued before receipts existed — is skipped rather than signed with nothing.
 */
export async function issueShareReceipt(args: {
  grantId: string;
  coins: number;
  usage: ProxyShareUsage;
  model?: string;
  balanceAfter: number | null;
  settledAt?: number;
}): Promise<ProxyShareReceipt | undefined> {
  try {
    const grant = await getShareGrant(args.grantId);
    const secret = grant?.receiptSecret;
    if (!secret) {
      return undefined;
    }
    return await mutationMutex.runExclusive(async () => {
      await ensureLoaded();
      const history = receipts[args.grantId] ?? [];
      // From the recorded high-water mark, not the retained tail: the tail is
      // trimmed, and restarting the sequence would read as a replay.
      const previous = highestSequence[args.grantId] ?? 0;
      const unsigned: Omit<ProxyShareReceipt, "signature"> = {
        schemaVersion: 1,
        grantId: args.grantId,
        sequence: previous + 1,
        settledAt: args.settledAt ?? Date.now(),
        ...(args.model ? { model: args.model } : {}),
        usage: args.usage,
        coins: args.coins,
        balanceAfter: args.balanceAfter,
      };
      const receipt: ProxyShareReceipt = {
        ...unsigned,
        signature: signSharePayload(receiptPayload(unsigned), secret),
      };
      history.push(receipt);
      // Oldest first, so trimming the front is trimming the oldest.
      receipts[args.grantId] = history.slice(-RECEIPT_HISTORY_LIMIT);
      highestSequence[args.grantId] = receipt.sequence;
      consumedTotal[args.grantId] =
        (consumedTotal[args.grantId] ?? 0) + args.coins;
      await persist();
      return receipt;
    });
  } catch (error) {
    logger.always(
      `[proxy] could not record a receipt for grant=${args.grantId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
}

/** Receipts a borrower has not collected yet. */
export async function listShareReceipts(
  grantId: string,
  since = 0,
): Promise<ProxyShareReceipt[]> {
  await ensureLoaded({ force: true });
  return (receipts[grantId] ?? []).filter(
    (receipt) => receipt.sequence > since,
  );
}

/**
 * Check a collected run of receipts against the secret and against itself.
 *
 * Three independent questions, because they have different answers:
 * a signature that does not verify means the receipt did not come from this
 * lender; a coin figure that disagrees with its own usage block means the
 * lender's arithmetic (or its price table) differs from ours; a missing
 * sequence means a charge was never shown to us at all.
 */
export function auditShareReceipts(
  grantId: string,
  collected: readonly ProxyShareReceipt[],
  secret: string | undefined,
): ProxyShareStatement {
  let coins = 0;
  let unverified = 0;
  let miscounted = 0;
  const seen = new Set<number>();
  for (const receipt of collected) {
    coins += receipt.coins;
    seen.add(receipt.sequence);
    const { signature, ...unsigned } = receipt;
    if (!secret || !verifySharePayload(unsigned, signature, secret)) {
      unverified += 1;
    }
    const expected = usageToCoins(receipt.usage, receipt.model);
    // A tenth of a coin is a hundred normalized tokens — below any rounding
    // this pipeline introduces, and far below a charge worth arguing about.
    if (Math.abs(expected - receipt.coins) > 0.1) {
      miscounted += 1;
    }
  }
  const latestSequence = collected.reduce(
    (highest, receipt) => Math.max(highest, receipt.sequence),
    0,
  );
  // Anchored to the lowest sequence actually collected, not to 1. A borrower
  // that collects incrementally asks for everything after the last sequence it
  // holds, and every earlier receipt — already collected, or trimmed from the
  // lender's bounded history — would otherwise be reported as a withheld one.
  const earliestSequence = collected.reduce(
    (lowest, receipt) => Math.min(lowest, receipt.sequence),
    latestSequence,
  );
  const gaps: number[] = [];
  for (
    let sequence = earliestSequence;
    sequence <= latestSequence;
    sequence += 1
  ) {
    if (!seen.has(sequence)) {
      gaps.push(sequence);
    }
  }
  return {
    grantId,
    receipts: collected.length,
    coins,
    unverified,
    miscounted,
    gaps,
    latestSequence,
  };
}

/** Cumulative coins a grant has consumed, as its receipts record it. */
export async function totalReceiptedCoins(grantId: string): Promise<number> {
  await ensureLoaded({ force: true });
  return consumedTotal[grantId] ?? 0;
}

/** Cumulative coins already forgiven on a grant by netting. */
export async function nettedCoinsFor(grantId: string): Promise<number> {
  await ensureLoaded({ force: true });
  return netted[grantId] ?? 0;
}

/**
 * Settle one round of reciprocal netting, from the lender's side.
 *
 * Netting forgives the same amount on both sides, so the cumulative total
 * forgiven is one number the two nodes hold a copy of each. The round is
 * therefore the overlap that has not been forgiven yet:
 *
 * ```
 * forgivable = min(coins they consumed of mine, coins I consumed of theirs)
 * alreadyForgiven = max(my record, their record)
 * round = max(0, forgivable - alreadyForgiven)
 * ```
 *
 * **Why the totals and not a delta.** A delta is a number the caller chooses,
 * and a replayed round would pay it out again. Deriving the round from
 * cumulative positions makes a replay free by construction: the second call
 * subtracts the first one's forgiveness and lands on zero.
 *
 * **Why `max` over the two records.** They should agree. When they do not — a
 * round applied on one side and lost on the other — taking the larger forgives
 * less, which is the direction that cannot hand out coins twice.
 */
export async function applyReciprocalNetting(args: {
  grantId: string;
  /** Cumulative coins this node has consumed under the *peer's* grant to it. */
  consumedFromPeer: number;
  /** Cumulative coins the peer says it has already forgiven on its side. */
  peerAlreadyNetted: number;
}): Promise<ProxyShareNettingResult> {
  return mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    // The lifetime figure, not the retained history: netting forgives against
    // cumulative positions, and a trimmed sum would forgive the same coins
    // again on the next round.
    const consumedByPeer = consumedTotal[args.grantId] ?? 0;
    const alreadyNetted = Math.max(
      netted[args.grantId] ?? 0,
      Math.max(0, args.peerAlreadyNetted),
    );
    const forgivable = Math.min(
      consumedByPeer,
      Math.max(0, args.consumedFromPeer),
    );
    const round = Math.max(0, forgivable - alreadyNetted);
    if (round <= 0) {
      return {
        netted: 0,
        totalNetted: alreadyNetted,
        detail:
          consumedByPeer <= alreadyNetted
            ? "nothing of mine left to forgive"
            : "nothing of theirs left to offset it against",
      };
    }
    netted[args.grantId] = alreadyNetted + round;
    await persist();
    // Forgiveness is a credit: the borrower gets back what its own lending
    // cancelled out. An unlimited grant has no balance to credit, and netting
    // there is bookkeeping only.
    await creditShareGrantCoins(args.grantId, round);
    return {
      netted: round,
      totalNetted: netted[args.grantId],
      detail: `forgave ${round.toFixed(1)} coins against reciprocal use`,
    };
  });
}

/** Drop a grant's receipts and netting position. Used when the grant goes. */
export async function clearShareReceipts(grantId: string): Promise<void> {
  await mutationMutex.runExclusive(async () => {
    await ensureLoaded({ force: true });
    if (
      receipts[grantId] ||
      netted[grantId] !== undefined ||
      consumedTotal[grantId] !== undefined ||
      highestSequence[grantId] !== undefined
    ) {
      delete receipts[grantId];
      delete netted[grantId];
      delete consumedTotal[grantId];
      delete highestSequence[grantId];
      await persist();
    }
  });
}
