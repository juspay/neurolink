/**
 * Shared string-distance helpers for "did you mean?" suggestions.
 *
 * Extracted from toolCallRepair.ts, which had the only implementation, so
 * provider-name validation can reuse it rather than carry a second copy.
 */

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses the iterative matrix approach — O(m*n) time, O(min(m,n)) space.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  // Use shorter string as column to minimize space
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;
  let prev = new Array<number>(aLen + 1);
  let curr = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[aLen];
}

/**
 * Candidates within `maxDistance` edits of `input`, closest first.
 *
 * Ties break on the candidate's own order in `candidates`, so a caller that
 * passes canonical names before aliases gets the canonical one suggested.
 * Comparison is case-insensitive; the returned strings keep their original
 * casing so they can be pasted back verbatim.
 *
 * @param input - The string the user actually typed
 * @param candidates - Valid values, most-preferred first
 * @param options.maxDistance - Edit budget (default 3)
 * @param options.limit - Most suggestions to return (default 3)
 */
export function suggestClosest(
  input: string,
  candidates: readonly string[],
  options?: { maxDistance?: number; limit?: number },
): string[] {
  const maxDistance = options?.maxDistance ?? 3;
  const limit = options?.limit ?? 3;
  const needle = input.toLowerCase();

  return candidates
    .map((candidate, order) => ({
      candidate,
      order,
      distance: levenshtein(needle, candidate.toLowerCase()),
    }))
    .filter((scored) => scored.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance || a.order - b.order)
    .slice(0, limit)
    .map((scored) => scored.candidate);
}
