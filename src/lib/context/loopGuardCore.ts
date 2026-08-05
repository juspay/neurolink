/**
 * Provider-neutral agent-loop reclaim policy.
 *
 * Every native provider loop grows its own history as the model calls tools,
 * and every one of them can overflow the model's window mid-turn. The policy
 * for reclaiming that budget is identical regardless of message shape:
 *
 *   Stage 1 — shrink old tool outputs to head/tail previews.
 *   Stage 2 — drop the oldest complete tool batches, as units, when previews
 *             are not enough (or when outputs are already small enough that
 *             truncation buys nothing).
 *
 * What differs per provider is only the message SHAPE. So this module owns the
 * decision and adapters own the mechanics: map your history onto
 * `LoopGuardEntry[]`, call `planLoopGuardReclaim`, apply the returned indices.
 *
 * Two invariants the policy never violates:
 *   - entry 0 (the task) is never touched
 *   - a tool batch is dropped whole or not at all, so a `tool_call` never
 *     loses its `tool_result` (providers hard-reject the orphan)
 */

import type {
  LoopGuardEntry,
  LoopGuardPlan,
  LoopGuardPolicy,
} from "../types/index.js";
import { DEFAULT_CONTEXT_GUARD_RATIO } from "../core/constants.js";

/**
 * Fraction of the window the guard reclaims DOWN TO once it fires.
 *
 * The threshold decides *when*; this decides *how far*. Reclaiming only back to
 * the threshold means the next step — which appends an assistant turn plus its
 * tool results — crosses it again, so the guard rewrites the oldest messages on
 * every single step. That mutation invalidates the provider's cached prompt
 * prefix each time. One deeper reclaim every N steps saves the same tokens and
 * leaves the prefix stable in between.
 */
export const DEFAULT_LOOP_GUARD_LOW_WATER_RATIO = 0.6;

/** Newest entries the guard never modifies. */
export const DEFAULT_LOOP_GUARD_PROTECTED_TAIL = 4;

/** True for the two kinds that make up a tool batch. */
function isToolEntry(entry: LoopGuardEntry | undefined): boolean {
  return entry?.kind === "toolCall" || entry?.kind === "toolResult";
}

/**
 * One agent step's tool batch: the run of calls, then the run of results that
 * answers them. `end` is exclusive.
 *
 * The boundary is calls-then-results, NOT any maximal run of tool entries — a
 * loop's history is `call,result,call,result,…`, so treating a maximal run as
 * one batch would collapse the entire conversation into a single droppable
 * unit and scorch it in one pass. Mirrors `collectBatch` in toolPairRepair.
 */
function findToolBatches(
  entries: readonly LoopGuardEntry[],
  minIndex: number,
  maxIndexExclusive: number,
): Array<{ start: number; end: number }> {
  const batches: Array<{ start: number; end: number }> = [];
  let i = minIndex;
  while (i < maxIndexExclusive) {
    if (!isToolEntry(entries[i])) {
      i++;
      continue;
    }
    const start = i;
    while (i < maxIndexExclusive && entries[i].kind === "toolCall") {
      i++;
    }
    while (i < maxIndexExclusive && entries[i].kind === "toolResult") {
      i++;
    }
    batches.push({ start, end: i });
  }
  return batches;
}

/**
 * Decide what to reclaim, if anything.
 *
 * Returns `fire: false` when the projected request is within threshold — the
 * caller must then leave its history completely untouched, so a loop that fits
 * never pays a cache invalidation.
 */
export function planLoopGuardReclaim(
  entries: readonly LoopGuardEntry[],
  policy: LoopGuardPolicy,
): LoopGuardPlan {
  const {
    availableInputTokens,
    fixedOverheadTokens,
    thresholdRatio = DEFAULT_CONTEXT_GUARD_RATIO,
    lowWaterRatio = DEFAULT_LOOP_GUARD_LOW_WATER_RATIO,
    protectedTailCount = DEFAULT_LOOP_GUARD_PROTECTED_TAIL,
    calibration = 1,
  } = policy;

  const safeCalibration = calibration > 0 ? calibration : 1;
  const thresholdTokens = Math.floor(
    (availableInputTokens * thresholdRatio) / safeCalibration,
  );
  const lowWaterTokens = Math.floor(
    (availableInputTokens * lowWaterRatio) / safeCalibration,
  );

  let total = fixedOverheadTokens;
  for (const entry of entries) {
    total += entry.tokens;
  }

  if (total <= thresholdTokens) {
    return { fire: false, truncate: [], drop: [], projectedTokens: total };
  }

  // Entry 0 is the task and the newest `protectedTailCount` entries are the
  // live working set — the mutable window sits strictly between them.
  const minIndex = 1;
  const maxIndexExclusive = Math.max(
    minIndex,
    entries.length - protectedTailCount,
  );

  const truncate: number[] = [];
  const dropped = new Set<number>();

  // Stage 1: shrink old tool outputs, oldest first.
  for (let i = minIndex; i < maxIndexExclusive && total > lowWaterTokens; i++) {
    const entry = entries[i];
    if (entry.kind !== "toolResult" || entry.previewTokens === undefined) {
      continue;
    }
    const saving = entry.tokens - entry.previewTokens;
    if (saving <= 0) {
      continue;
    }
    truncate.push(i);
    total -= saving;
  }

  // Stage 2: drop whole batches, oldest first, while still over the low-water
  // mark. This is the only lever when outputs are already smaller than a
  // preview — the regime where truncation alone cannot converge.
  if (total > lowWaterTokens) {
    const batches = findToolBatches(entries, minIndex, maxIndexExclusive);
    for (const batch of batches) {
      if (total <= lowWaterTokens) {
        break;
      }
      for (let i = batch.start; i < batch.end; i++) {
        const entry = entries[i];
        // A truncated entry now costs its preview, not its original payload.
        const effective = truncate.includes(i)
          ? (entry.previewTokens ?? entry.tokens)
          : entry.tokens;
        total -= effective;
        dropped.add(i);
      }
    }
  }

  // Truncating an entry that is being dropped anyway is wasted work.
  const effectiveTruncate = truncate.filter((i) => !dropped.has(i));

  return {
    fire: effectiveTruncate.length > 0 || dropped.size > 0,
    truncate: effectiveTruncate,
    drop: [...dropped].sort((a, b) => a - b),
    projectedTokens: total,
  };
}
