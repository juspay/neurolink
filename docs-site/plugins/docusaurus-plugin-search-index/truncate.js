/**
 * Cuts a section's plain text to the search index's per-section limit without
 * leaving it stopped mid-sentence or mid-word where that can be avoided.
 *
 * A bare `slice(0, 2000)` ended the XOR guide's "Limits" entry on "On t": the
 * reader got half a word and no sign the text had been cut. The cut now lands,
 * in this order, on
 *
 *   1. the end of the last sentence that fits, if that keeps at least half the
 *      limit. A dot inside "5.6" or "v1.2" is never a sentence end, and neither
 *      is the dot that closes "e.g.", "i.e.", "cf.", "vs.", "viz.", "approx.",
 *      "incl.", "resp.", "fig.", "figs.", "eq." or "eqs." (case-insensitive, as
 *      a whole word): the example or the second term comes next, so a cut there
 *      would leave "... for example, e.g." with the example missing. "No.",
 *      "Nos." and "Vol." are abbreviations only before a number ("No. 5"):
 *      "no." is also a word that ends a sentence ("The answer was no."). "etc."
 *      can close a real sentence, so it counts as one only when the next word
 *      starts with an uppercase letter or the text ends;
 *   2. else the last whitespace that fits, if that keeps at least half;
 *   3. else the limit itself, backed off by one if it would split a surrogate
 *      pair. That is an unbroken run (a URL, a hash, text with no spaces);
 *      discarding half the section to avoid cutting it would cost more search
 *      recall than a ragged edge does.
 *
 * Half is the floor because the index exists for recall: one early sentence
 * end must not throw away the next 1,900 characters.
 *
 * Kept free of dependencies, like headingId.js, so a test can load it without
 * the docs site's packages.
 *
 * @param {string} text plain text, already stripped of Markdown
 * @param {number} [max] limit in UTF-16 code units
 * @returns {string} at most `max` code units
 */
const SECTION_CONTENT_LIMIT = 2000;

const NEVER_ENDS_SENTENCE =
  /(?:^|[^\p{L}\p{N}_])(?:e\.g|i\.e|cf|vs|viz|approx|incl|resp|figs?|eqs?)$/iu;
// Abbreviations that are also ordinary words, so they are read as one only
// when a number follows: "No. 5", "Nos. 3 and 4", "Vol. 2".
const BEFORE_A_NUMBER = /(?:^|[^\p{L}\p{N}_])(?:nos?|vol)$/iu;
const STARTS_A_NUMBER = /^\s*[#(]?\p{N}/u;
const ETC = /(?:^|[^\p{L}\p{N}_])etc$/iu;
// Opening quotes and brackets (\p{Pi}, \p{Ps}, and the ASCII quotes) may sit between
// "etc." and the capital that starts the next sentence: etc. “Next ...
const STARTS_A_SENTENCE = /^\s*["'\p{Pi}\p{Ps}]*(?:\p{Lu}|$)/u;
// "approx", the longest token, is 6 characters; one more must precede it.
const TOKEN_LOOKBEHIND = 8;

/**
 * Whether the dot at `dotIndex` closes an abbreviation, so what follows is the
 * same sentence going on rather than a new one.
 *
 * @param {string} text the whole text, not only the window being cut
 * @param {number} dotIndex index of the sentence-ending character; anything
 *   but a dot (`!`, `?`) is never an abbreviation
 * @param {number} afterIndex index just past the dot and any closing quote or
 *   bracket
 * @returns {boolean}
 */
function closesAbbreviation(text, dotIndex, afterIndex) {
  if (text[dotIndex] !== ".") {
    return false;
  }
  const before = text.slice(Math.max(0, dotIndex - TOKEN_LOOKBEHIND), dotIndex);
  if (NEVER_ENDS_SENTENCE.test(before)) {
    return true;
  }
  if (BEFORE_A_NUMBER.test(before)) {
    return STARTS_A_NUMBER.test(text.slice(afterIndex));
  }
  return ETC.test(before) && !STARTS_A_SENTENCE.test(text.slice(afterIndex));
}

function truncateAtBoundary(text, max = SECTION_CONTENT_LIMIT) {
  if (text.length <= max) {
    return text;
  }

  // One code unit past the limit, so a boundary exactly at `max` (whitespace
  // right after the last kept character) is seen by the look-ahead below.
  const window = text.slice(0, max + 1);
  const floor = Math.floor(max / 2);

  // `.`, `!` or `?`, optionally closed by a quote or bracket, then whitespace.
  // A dot inside "5.6" or "v1.2" is followed by a non-space and never matches.
  // The dot of an abbreviation does match, so `closesAbbreviation` rules it out.
  const sentenceEnd = /[.!?]["'\u2019\u201d)\]]*(?=\s)/g;
  let sentenceCut = -1;
  for (
    let match = sentenceEnd.exec(window);
    match !== null;
    match = sentenceEnd.exec(window)
  ) {
    const end = match.index + match[0].length;
    if (end <= max && !closesAbbreviation(text, match.index, end)) {
      sentenceCut = end;
    }
  }
  if (sentenceCut >= floor) {
    return text.slice(0, sentenceCut);
  }

  for (let i = max; i >= floor; i--) {
    if (/\s/.test(window[i])) {
      return text.slice(0, i).trimEnd();
    }
  }

  const last = text.charCodeAt(max - 1);
  const splitsPair = last >= 0xd800 && last <= 0xdbff;
  return text.slice(0, splitsPair ? max - 1 : max);
}

module.exports = { truncateAtBoundary, SECTION_CONTENT_LIMIT };
