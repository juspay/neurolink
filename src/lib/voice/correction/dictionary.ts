/**
 * Dictionary matching for transcript correction.
 *
 * A dictionary entry names a term (a person, product, acronym …), the ways
 * speech engines mis-hear it, and what it means. Every alias found in a
 * transcript becomes a *candidate*: it is not applied blindly, because the
 * alias of a name is usually an ordinary word too ("part" for a name that
 * sounds like it). The guard (`guard.ts`) decides per candidate; this module
 * only finds them and applies the verdicts.
 *
 * Matching is whole-word and script-agnostic: a word boundary is any
 * character that is not a letter, a combining mark or a digit. Marks matter
 * for Indic scripts, where vowel signs and viramas are `\p{M}`, not `\p{L}` —
 * a letters-only boundary would let an alias match the first half of a word.
 *
 * @module voice/correction/dictionary
 */

import type {
  STTDecisionRecord,
  STTDictionaryCandidate,
  STTDictionaryEntry,
} from "../../types/index.js";

/**
 * Any Indic script, Devanagari (U+0900) through Sinhala (U+0DFF): Bengali,
 * Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada and Malayalam sit between.
 */
const INDIC_SCRIPT_RE = /[ऀ-෿]/u;

/** Characters that continue a word: letters, combining marks, digits. */
const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}]";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word, case-insensitive matcher for `phrase`. Whitespace inside a
 * multi-word alias matches any run of whitespace, since engines differ in how
 * they space words.
 */
function wholeWordPattern(phrase: string, flags = "iu"): RegExp {
  const body = escapeRegExp(phrase.trim()).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<!${WORD_CHAR})${body}(?!${WORD_CHAR})`, flags);
}

/** Whether `text` contains any Indic-script character. */
export function hasIndicScript(text: string): boolean {
  return INDIC_SCRIPT_RE.test(text);
}

/**
 * Every alias of every entry that occurs in `text` as a whole word.
 *
 * An entry whose term already appears in the text contributes no candidates:
 * the engine heard the term itself, so an alias elsewhere in the same text is
 * more likely the ordinary word. An alias in an Indic script is skipped when
 * the text has none (it cannot match, and the check is cheaper than a regex).
 * Each (entry, alias) pair is reported once, however often it occurs.
 */
export function findDictionaryCandidates(
  text: string,
  dictionary: readonly STTDictionaryEntry[] | undefined,
): STTDictionaryCandidate[] {
  if (!text || !dictionary?.length) {
    return [];
  }
  const textHasIndic = hasIndicScript(text);
  const out: STTDictionaryCandidate[] = [];
  for (const entry of dictionary) {
    const term = entry?.term?.trim();
    if (!term || !entry.heardAs?.length) {
      continue;
    }
    if (wholeWordPattern(term).test(text)) {
      continue;
    }
    const seen = new Set<string>();
    for (const alias of entry.heardAs) {
      const heard = typeof alias === "string" ? alias.trim() : "";
      if (!heard || seen.has(heard.toLowerCase())) {
        continue;
      }
      seen.add(heard.toLowerCase());
      if (hasIndicScript(heard) && !textHasIndic) {
        continue;
      }
      if (wholeWordPattern(heard).test(text)) {
        out.push({ entry, heard });
      }
    }
  }
  return out;
}

/**
 * Replace every candidate the guard did not call `"literal"` with its term.
 *
 * `decisions[i]` belongs to `candidates[i]`; a missing decision applies the
 * term, which is the same fail-open default the guard uses. Every occurrence
 * is replaced — the decision was asked about the alias in this transcript, so
 * all of its occurrences share the answer.
 */
export function applyDictionary(
  text: string,
  candidates: readonly STTDictionaryCandidate[],
  decisions: readonly STTDecisionRecord[],
): string {
  let out = text;
  candidates.forEach((candidate, index) => {
    if (decisions[index]?.choice === "literal") {
      return;
    }
    const term = candidate.entry.term.trim();
    // A function replacement, so a "$" in the term is never read as a group reference.
    out = out.replace(wholeWordPattern(candidate.heard, "giu"), () => term);
  });
  return out;
}

/**
 * The dictionary as a table for the rewrite model's system prompt, or `""`
 * when there is nothing to show.
 */
export function dictionaryBlock(
  dictionary: readonly STTDictionaryEntry[] | undefined,
): string {
  const rows = (dictionary ?? [])
    .filter((entry) => entry?.term?.trim())
    .map((entry) => {
      const heard = (entry.heardAs ?? [])
        .map((alias) => alias.trim())
        .filter(Boolean)
        .join(", ");
      return `${entry.term.trim()} | ${heard || "-"} | ${entry.meaning?.trim() || "-"}`;
    });
  return rows.length
    ? `Dictionary (term | also heard as | meaning):\n${rows.join("\n")}`
    : "";
}

/**
 * Distinct dictionary terms, in dictionary order, for engines that bias
 * recognition on a vocabulary or a context prompt.
 */
export function dictionaryVocabulary(
  dictionary: readonly STTDictionaryEntry[] | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of dictionary ?? []) {
    const term = entry?.term?.trim();
    if (term && !seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      out.push(term);
    }
  }
  return out;
}
