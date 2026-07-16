/**
 * Deterministic text normalization for knowledge grounding.
 *
 * The SAME normalizer runs at index-build time and query time so that a
 * configuration key, a technical identifier, and a user's phrasing all
 * collapse to the same comparable token stream:
 *
 *   "Multi-Step Flow"        -> "multi step flow"
 *   "enableMultiStepFlow"    -> "enable multi step flow"
 *   "ACCOUNT_STATUS"         -> "account status"
 *   "  Access   Policy  "    -> "access policy"
 *
 * The pipeline is intentionally conservative: it splits identifiers and
 * separators and folds case/diacritics, but it NEVER invents synonyms.
 * Reviewed acronym and spelling expansions belong in an entry's `aliases`,
 * not in this function.
 */

/**
 * Insert spaces at camelCase / PascalCase / acronym boundaries. Must run
 * BEFORE lowercasing because it relies on case information.
 *
 *   "enableURLReading"            -> "enable URL Reading"
 *   "customAccessOptionsV2"       -> "custom Access Options V2"
 */
const splitIdentifierBoundaries = (input: string): string =>
  input
    // lower/number followed by an uppercase: "enableTwo" -> "enable Two"
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    // acronym run followed by a Word: "URLReading" -> "URL Reading"
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2");

/**
 * Normalize an arbitrary string into a single space-delimited lowercase
 * phrase. Idempotent: `normalizeText(normalizeText(x)) === normalizeText(x)`.
 */
export const normalizeText = (input: string): string => {
  if (!input) {
    return "";
  }
  const boundaries = splitIdentifierBoundaries(
    // NFKC folds compatibility forms; NFD + mark-strip removes diacritics.
    input
      .normalize("NFKC")
      .normalize("NFD")
      .replace(/\p{M}+/gu, ""),
  );
  return (
    boundaries
      // any run of non-letter/non-number (snake_case, kebab-case, dots, slashes,
      // punctuation, and existing whitespace) collapses to a single space.
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLowerCase()
  );
};

/**
 * Normalize then split into tokens. Empty input yields an empty array.
 * Numbers and alphanumeric identifiers are preserved as their own tokens.
 */
export const tokenize = (input: string): string[] => {
  const normalized = normalizeText(input);
  return normalized ? normalized.split(" ") : [];
};

/**
 * Normalize each candidate phrase and drop blanks/duplicates while preserving
 * first-seen order. Used to build the exact-key and alias key sets.
 */
export const normalizePhrases = (phrases: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phrase of phrases) {
    const normalized = normalizeText(phrase);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
};
