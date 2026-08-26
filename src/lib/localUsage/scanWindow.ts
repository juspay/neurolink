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
 * Contract: `Infinity` is the ONLY value meaning all-history. Anything that is
 * not a usable finite window — NaN, negative, or so large the arithmetic stops
 * being finite — collapses to a zero-length window, which is what a
 * nonsensical request should read as.
 */
export const DEFAULT_SINCE_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/**
 * @returns the epoch-ms cutoff a scan must not read past, or `undefined` for an
 * unbounded (all-history) scan — which only `Infinity` produces.
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
