/**
 * Provider-neutral speaker turns.
 *
 * Diarizing STT providers disagree about where the speaker label lives:
 * Deepgram and Google put it on every word, ElevenLabs Scribe puts it on
 * every token, the diarization sidecar puts it on each segment. Callers want
 * one shape — a list of turns, each with a speaker, a time range and text —
 * so `STTProcessor` derives it here whenever a provider returned speaker
 * labels on words but no speaker-labelled segments of its own.
 *
 * @module utils/speakerTurns
 */

import type { TranscriptionSegment, WordTiming } from "../types/index.js";

/**
 * Merge consecutive same-speaker words into turns.
 *
 * A word without a speaker continues the current turn (providers emit
 * unlabelled punctuation and spacing tokens); a word with a different
 * speaker starts a new one. Words are joined with single spaces and the
 * result trimmed, so text built from punctuated words reads naturally.
 * Returns `[]` when no word carries a speaker, so callers can tell "no
 * diarization" apart from "one speaker".
 */
export function buildSpeakerTurns(words: WordTiming[]): TranscriptionSegment[] {
  if (!words.some((w) => w.speaker !== undefined)) {
    return [];
  }

  const turns: TranscriptionSegment[] = [];
  let current: { speaker: string; words: WordTiming[] } | undefined;

  for (const word of words) {
    const speaker = word.speaker ?? current?.speaker;
    if (speaker === undefined) {
      continue; // leading unlabelled tokens before the first speaker
    }
    if (!current || current.speaker !== speaker) {
      if (current) {
        turns.push(toSegment(current.speaker, current.words, turns.length));
      }
      current = { speaker, words: [] };
    }
    current.words.push(word);
  }
  if (current && current.words.length > 0) {
    turns.push(toSegment(current.speaker, current.words, turns.length));
  }
  return turns;
}

function toSegment(
  speaker: string,
  words: WordTiming[],
  index: number,
): TranscriptionSegment {
  const starts = words
    .map((w) => w.startTime ?? w.start)
    .filter((t): t is number => typeof t === "number");
  const ends = words
    .map((w) => w.endTime ?? w.end)
    .filter((t): t is number => typeof t === "number");
  const confidences = words
    .map((w) => w.confidence)
    .filter((c): c is number => typeof c === "number");
  const segment: TranscriptionSegment = {
    index,
    // Collapse whitespace first, so the punctuation pass only ever sees one
    // space; `\s+` before a character class is quadratic on a long run of
    // whitespace with no punctuation after it (CodeQL js/polynomial-redos).
    text: words
      .map((w) => w.word)
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/ ([,.;:!?])/g, "$1")
      .trim(),
    isFinal: true,
    speaker,
    words,
  };
  if (starts.length > 0) {
    segment.startTime = Math.min(...starts);
  }
  if (ends.length > 0) {
    segment.endTime = Math.max(...ends);
  }
  if (confidences.length > 0) {
    segment.confidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
  return segment;
}

/** Distinct speaker labels in order of first appearance. */
export function listSpeakers(
  items: ReadonlyArray<{ speaker?: string }>,
): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.speaker !== undefined) {
      seen.add(item.speaker);
    }
  }
  return [...seen];
}
