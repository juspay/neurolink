/**
 * Cuts a section's plain text to the search index's per-section limit without
 * leaving it stopped mid-sentence or mid-word where that can be avoided.
 *
 * A bare `slice(0, 2000)` ended the XOR guide's "Limits" entry on "On t": the
 * reader got half a word and no sign the text had been cut. The cut now lands,
 * in this order, on
 *
 *   1. the end of the last sentence that fits, if that keeps at least half the
 *      limit;
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
  const sentenceEnd = /[.!?]["'\u2019\u201d)\]]*(?=\s)/g;
  let sentenceCut = -1;
  for (
    let match = sentenceEnd.exec(window);
    match !== null;
    match = sentenceEnd.exec(window)
  ) {
    const end = match.index + match[0].length;
    if (end <= max) {
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
