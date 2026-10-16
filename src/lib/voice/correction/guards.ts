/**
 * Guards on raw engine output, applied before LocalAgreement, the dictionary
 * and the rewrite ever see a text. They catch the two ways a speech engine
 * produces words that were never said:
 *
 * - a decoding loop ("Same one. Same one. Same one. …" for hundreds of
 *   words), which Qwen3-ASR falls into on long or noisy chunks, and which the
 *   correction layer cannot repair on purpose (removing the repeats would
 *   trip the never-lose-words drop guard);
 * - a prompt echo, where an engine answers a near-silent chunk with the
 *   vocabulary prompt it was given ("Names and terms used: …").
 *
 * Both are deterministic and cheap, so they run on every pass.
 *
 * @module voice/correction/guards
 */

/** Longest phrase (in words) a loop is looked for; longer repeats are real speech. */
const MAX_NGRAM = 6;
/** Repeats of one phrase in a row that count as a loop; "no, no, no" stays. */
const LOOP_MIN_REPEATS = 4;
/** Occurrences kept when a loop is collapsed. */
const KEEP_REPEATS = 2;

/** A word stripped of punctuation and case, for comparing repeats. */
function key(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[\s"'“”‘’([{¿¡]+|[\s"'“”‘’)\]}.,!?;:…।॥]+$/gu, "");
}

/**
 * Collapse runaway repetition: any phrase of 1 to {@link MAX_NGRAM} words that
 * repeats itself {@link LOOP_MIN_REPEATS} or more times in a row is cut down to
 * {@link KEEP_REPEATS} occurrences. Returns the text and how many words were
 * removed; `removed` is 0 when the text was left alone. Spacing between the
 * surviving words is normalised to single spaces.
 */
export function collapseRepetitions(text: string): {
  text: string;
  removed: number;
} {
  const words = text.split(/\s+/u).filter(Boolean);
  if (words.length < LOOP_MIN_REPEATS) {
    return { text, removed: 0 };
  }
  const keys = words.map(key);
  const out: string[] = [];
  let removed = 0;
  let i = 0;
  while (i < words.length) {
    let collapsed = false;
    for (
      let n = 1;
      n <= MAX_NGRAM && i + n * LOOP_MIN_REPEATS <= words.length;
      n++
    ) {
      // How many times does the n-gram starting at i repeat back to back?
      let repeats = 1;
      while (
        i + (repeats + 1) * n <= words.length &&
        sameNgram(keys, i, i + repeats * n, n)
      ) {
        repeats++;
      }
      if (repeats >= LOOP_MIN_REPEATS) {
        for (let k = 0; k < KEEP_REPEATS * n; k++) {
          out.push(words[i + k]);
        }
        removed += (repeats - KEEP_REPEATS) * n;
        i += repeats * n;
        collapsed = true;
        break;
      }
    }
    if (!collapsed) {
      out.push(words[i]);
      i++;
    }
  }
  return removed > 0 ? { text: out.join(" "), removed } : { text, removed: 0 };
}

function sameNgram(keys: string[], a: number, b: number, n: number): boolean {
  for (let k = 0; k < n; k++) {
    if (keys[a + k] !== keys[b + k] || keys[a + k] === "") {
      return false;
    }
  }
  return true;
}

/**
 * True when an engine's output is the prompt it was given, or a subset of
 * it: every word of the output occurs in `promptTerms` (the vocabulary
 * terms and the fixed phrasing around them), AND it reads like the prompt
 * rather than speech — it carries the fixed phrasing, or lists two or more
 * distinct terms. A speaker who says only "Juspay." said a term; that is
 * speech and is kept. An output with no words is not an echo; the empty
 * path handles it.
 */
export function isPromptEcho(
  text: string,
  promptTerms: readonly string[],
): boolean {
  const words = text.split(/\s+/u).map(key).filter(Boolean);
  if (words.length === 0 || promptTerms.length === 0) {
    return false;
  }
  const allowed = new Set<string>();
  for (const term of promptTerms) {
    for (const w of term.split(/\s+/u).map(key)) {
      if (w) {
        allowed.add(w);
      }
    }
  }
  if (!words.every((w) => allowed.has(w))) {
    return false;
  }
  const joined = ` ${words.join(" ")} `;
  if (joined.includes(` ${PROMPT_PHRASE} `)) {
    return true;
  }
  const termsSeen = new Set<string>();
  for (const term of promptTerms) {
    const phrase = term.split(/\s+/u).map(key).filter(Boolean).join(" ");
    if (phrase && phrase !== PROMPT_PHRASE && joined.includes(` ${phrase} `)) {
      termsSeen.add(phrase);
    }
  }
  return termsSeen.size >= 2;
}

/** The fixed phrasing a vocabulary prompt carries, as keyed words. */
const PROMPT_PHRASE = "names and terms used";

/** Share of a text's words that came from a collapsed loop, for a "mostly loop" decision. */
export function loopShare(removed: number, originalWordCount: number): number {
  return originalWordCount > 0 ? removed / originalWordCount : 0;
}
