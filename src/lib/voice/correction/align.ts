/**
 * Word timings for corrected text. The engine timed the words it wrote; a
 * rewrite changes them (spelling, script, punctuation), so the timings are
 * carried over: one for one when the word count is unchanged, else spread
 * over the same span in proportion to each word's length. Speaker labels are
 * kept only where every source word agrees.
 *
 * @module voice/correction/align
 */

import type { WordTiming } from "../../types/index.js";

function startOf(w: WordTiming): number | undefined {
  return w.startTime ?? w.start;
}

function endOf(w: WordTiming): number | undefined {
  return w.endTime ?? w.end;
}

/** `words` re-timed onto the words of `text`; empty when there is nothing to align. */
export function alignWordsToText(
  words: readonly WordTiming[] | undefined,
  text: string,
): WordTiming[] {
  const tokens = text.split(/\s+/u).filter(Boolean);
  if (!words?.length || tokens.length === 0) {
    return [];
  }
  if (tokens.length === words.length) {
    return words.map((w, i) => ({ ...w, word: tokens[i] }));
  }
  const spanStart = startOf(words[0]);
  const spanEnd =
    endOf(words[words.length - 1]) ?? startOf(words[words.length - 1]);
  if (spanStart === undefined || spanEnd === undefined || spanEnd < spanStart) {
    return [];
  }
  const speakers = new Set(words.map((w) => w.speaker));
  const speaker = speakers.size === 1 ? words[0].speaker : undefined;
  const total = tokens.reduce((n, t) => n + t.length, 0);
  const span = spanEnd - spanStart;
  let at = spanStart;
  return tokens.map((token) => {
    const start = at;
    const end = start + (span * token.length) / total;
    at = end;
    const timed: WordTiming = {
      word: token,
      start,
      startTime: start,
      end,
      endTime: end,
    };
    return speaker ? { ...timed, speaker } : timed;
  });
}
