/**
 * LocalAgreement for rolling re-transcription.
 *
 * Each interim pass re-transcribes the whole utterance so far. Words two
 * consecutive passes agree on are committed; the rest is the tail, which the
 * next pass may still change. The committed prefix never shrinks: once a
 * caption has been shown as stable it must not flicker back, even when a
 * later pass hears the start differently (the next final pass is the place
 * where the whole utterance is settled).
 *
 * @module voice/streaming/localAgreement
 */
import type {
  STTLocalAgreementState,
  STTLocalAgreementUpdate,
} from "../../types/index.js";

/** Splits a transcript into words on any whitespace. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Length of the shared prefix of two word lists. */
export function commonPrefixLength(a: string[], b: string[]): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) {
    n++;
  }
  return n;
}

export function createLocalAgreement(): STTLocalAgreementState {
  return { prevWords: [], committedWords: [], committedN: 0 };
}

/**
 * Folds one pass into the state and returns the split for display. Words
 * this pass agrees on with the previous one, beyond what is already
 * committed, are appended to the committed list; the words already committed
 * are kept as they were shown — they are never re-read from the new pass, so
 * a later pass that hears the start differently (or comes back shorter)
 * cannot shrink or rewrite them. The tail is whatever this pass has past the
 * committed count.
 */
export function updateLocalAgreement(
  state: STTLocalAgreementState,
  text: string,
): STTLocalAgreementUpdate {
  const words = splitWords(text);
  const agreedN = Math.max(
    state.committedN,
    commonPrefixLength(state.prevWords, words),
  );
  if (agreedN > state.committedN) {
    state.committedWords.push(...words.slice(state.committedN, agreedN));
    state.committedN = state.committedWords.length;
  }
  state.prevWords = words;
  return {
    words,
    committed: state.committedWords.join(" "),
    tail: words.slice(state.committedN).join(" "),
  };
}

/** Forgets everything, e.g. when another engine takes the utterance over. */
export function resetLocalAgreement(state: STTLocalAgreementState): void {
  state.prevWords = [];
  state.committedWords = [];
  state.committedN = 0;
}
