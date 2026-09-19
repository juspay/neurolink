/**
 * Shared string-distance helpers for "did you mean?" suggestions.
 *
 * Extracted from toolCallRepair.ts, which had the only implementation, so
 * provider-name validation can reuse it rather than carry a second copy.
 */

/**
 * Longest string the distance primitive will compare.
 *
 * Exported so every call site can apply the same limit *before* calling
 * `levenshtein` — skipping an over-limit operand entirely, rather than
 * comparing a truncated prefix of it. Truncating silently merged any two
 * strings that happened to share their first `MAX_COMPARABLE_LENGTH`
 * characters into distance 0, which let a direct MCP tool-name lookup
 * (`resolveToolName`) resolve to the wrong tool for a long, colliding name.
 */
export const MAX_COMPARABLE_LENGTH = 128;

const OVER_LIMIT_MESSAGE = `levenshtein: input exceeds MAX_COMPARABLE_LENGTH (${MAX_COMPARABLE_LENGTH}); callers must skip over-limit operands rather than truncate them`;

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses the iterative matrix approach — O(m*n) time, O(min(m,n)) space.
 *
 * Throws rather than truncating when either input exceeds
 * `MAX_COMPARABLE_LENGTH`: silently comparing truncated prefixes produces a
 * *wrong* distance (two distinct strings sharing a long prefix collapse to
 * distance 0) instead of no distance, which is worse than refusing outright.
 * Callers that want fuzzy matching over long input must apply the length
 * check themselves and skip the comparison — see `suggestClosest` below and
 * `resolveToolName`/`rankToolNameCandidates` in toolCallRepair.ts.
 */
export function levenshtein(a: string, b: string): number {
  // Names reach this from request bodies and model output, where the static
  // type is no runtime guarantee: a parsed-JSON object with a forged `length`
  // must never size the matrix below. This `typeof` test is what CodeQL's
  // js/loop-bound-injection recognises as ruling such an object out; a length
  // comparison alone is not.
  if (typeof a !== "string") {
    throw new TypeError("levenshtein: operands must be strings");
  }
  if (typeof b !== "string") {
    throw new TypeError("levenshtein: operands must be strings");
  }
  // Ahead of every return, so the limit holds for all inputs, including equal
  // strings and an empty operand.
  if (a.length > MAX_COMPARABLE_LENGTH) {
    throw new RangeError(OVER_LIMIT_MESSAGE);
  }
  if (b.length > MAX_COMPARABLE_LENGTH) {
    throw new RangeError(OVER_LIMIT_MESSAGE);
  }

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
 * `input` longer than `MAX_COMPARABLE_LENGTH` is rejected outright (no
 * suggestions), and any individual candidate over the same limit is skipped
 * rather than compared — never truncated. Truncating either side risks
 * exactly the false distance-0 match `levenshtein`'s guard rejects: two
 * distinct strings sharing a long-enough prefix would otherwise look
 * identical and "suggest" the wrong one.
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

  // Limits apply to the lowercased strings, since those are what get compared
  // and lowercasing can lengthen a string ("İ" becomes two code units).
  const needle = input.toLowerCase();
  if (needle.length > MAX_COMPARABLE_LENGTH) {
    return [];
  }

  const scored: { candidate: string; order: number; distance: number }[] = [];
  candidates.forEach((candidate, order) => {
    const lowered = candidate.toLowerCase();
    // Two strings whose lengths differ by more than the edit budget cannot be
    // within it, so this rules most candidates out without building a matrix
    // for them.
    if (Math.abs(lowered.length - needle.length) > maxDistance) {
      return;
    }
    if (lowered.length > MAX_COMPARABLE_LENGTH) {
      return;
    }
    const distance = levenshtein(needle, lowered);
    if (distance <= maxDistance) {
      scored.push({ candidate, order, distance });
    }
  });

  return scored
    .sort((a, b) => a.distance - b.distance || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
