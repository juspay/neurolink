/**
 * One definition of "how far back does a local-usage scan reach".
 *
 * This calculation lived in three copies — claudeCodeReader, codexReader and
 * openCodeReader — and has been wrong three separate times, each a different
 * door into the same failure: an unbounded sweep of every transcript on the
 * machine in answer to the narrowest possible request.
 *
 *   sinceDays: 0          left the cutoff undefined       17,534 files, 35.9s
 *   sinceDays: NaN        Math.max(0, NaN) is NaN, and every comparison
 *                         against NaN is false, so the filter passed
 *                         everything                       17,537 files, 32.8s
 *   sinceDays: MAX_VALUE  MAX_VALUE * 86_400_000 overflows to Infinity, so the
 *                         cutoff became -Infinity and every file passed
 *
 * Three fixes in three files each closed one door and left the others open.
 * The logic lives here once now, so the next door closes everywhere at once.
 *
 * Contract, stated as the two directions rather than as one rule, because the
 * single-sentence version of it was wrong here for weeks:
 *
 *   - `0`, negatives, `-Infinity` and `NaN` are NOT windows. They collapse to
 *     a zero-length one and read nothing. Two of the three historical defects
 *     above are here (`0` and `NaN`); `-Infinity` and negatives are the same
 *     class and were fixed with them.
 *   - `Infinity`, and any finite value whose window is longer than any
 *     history, mean ALL HISTORY. The THIRD historical defect — `MAX_VALUE` —
 *     lives in this bucket, not the one above: what was wrong about it was the
 *     mechanism (a `-Infinity` cutoff), never the outcome. A window of 1e308 days covers every
 *     transcript that could exist, so "everything" is the right answer to it
 *     and "nothing" is a wrong one.
 *
 * The prose here used to say the opposite of that second point — that a span
 * too large to stay finite "collapses to a zero-length window". The code never
 * did that, and the code was right. Anyone reconciling the two by changing the
 * code re-creates a defect this suite has already seen once: asserting
 * absurd-means-nothing produces a NON-MONOTONIC CLIFF, where 2.07e300 read
 * everything, 2.09e300 read nothing, and `Infinity` read everything again.
 * That was found by running the CLI — `usage local --since 999999999999`
 * reported 518,576 turns while `--since 1e308` reported 39 — not by reading
 * either the code or this comment.
 *
 * The invariant that actually holds, and the one worth testing, is
 * MONOTONICITY: a wider window never reads less than a narrower one, across
 * the whole range including the absurd end.
 */
export const DEFAULT_SINCE_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/**
 * @returns the epoch-ms cutoff a scan must not read past, or `undefined` for an
 * unbounded (all-history) scan.
 *
 * `undefined` has TWO sources, not one, and this line used to name only the
 * first: an explicit `Infinity`, and any finite request whose span overflows
 * (`Number.MAX_VALUE`). They mean the same thing on purpose — see the contract
 * above — but a reader who believes only `Infinity` reaches this branch will
 * mis-handle the second.
 */
export function resolveScanCutoffMs(
  sinceDays: number | undefined,
  defaultDays: number = DEFAULT_SINCE_DAYS,
): number | undefined {
  const requested = sinceDays ?? defaultDays;
  const days = Number.isNaN(requested) ? 0 : requested;
  if (days === Infinity) {
    return undefined;
  }
  const span = Math.max(0, days) * MS_PER_DAY;
  // A finite `days` can still produce a non-finite span: Number.MAX_VALUE and
  // anything near it overflow on the multiply. Treat that as no window rather
  // than letting `Date.now() - Infinity` become -Infinity, which every
  // timestamp compares as newer than.
  if (!Number.isFinite(span)) {
    return undefined;
  }
  return Date.now() - span;
}
