/**
 * Code-mix analysis between two engines' readings of the same speech.
 *
 * An Indic engine writes English words phonetically in its own script
 * ("मीटिंग" for "meeting"); an English-oriented engine writes Indian-language
 * words as English-sounding guesses ("page dinner" for "भेज देना"). Brought
 * to one rough phonetic form — Indic text romanized, both reduced to a
 * consonant skeleton with voicing and aspiration folded — the two sequences
 * line up word for word wherever the speaker spoke English, and stop lining
 * up where they spoke an Indian language. The share of the Indic engine's
 * words that find a phonetic partner is therefore an estimate of how much of
 * the utterance was English, independent of either engine's own (accent-
 * sensitive) language score; the alignment itself is what a word-level
 * combination of the two readings is built on.
 *
 * @module voice/codeMix
 */

import type { STTCodeMixAnalysis, STTWordPair } from "../types/index.js";

/** Devanagari (and, by block offset, every other Indic script) to rough Latin. */
const CONSONANTS: Record<number, string> = {
  0x15: "k",
  0x16: "kh",
  0x17: "g",
  0x18: "gh",
  0x19: "n",
  0x1a: "ch",
  0x1b: "chh",
  0x1c: "j",
  0x1d: "jh",
  0x1e: "n",
  0x1f: "t",
  0x20: "th",
  0x21: "d",
  0x22: "dh",
  0x23: "n",
  0x24: "t",
  0x25: "th",
  0x26: "d",
  0x27: "dh",
  0x28: "n",
  0x29: "n",
  0x2a: "p",
  0x2b: "ph",
  0x2c: "b",
  0x2d: "bh",
  0x2e: "m",
  0x2f: "y",
  0x30: "r",
  0x31: "r",
  0x32: "l",
  0x33: "l",
  0x34: "l",
  0x35: "v",
  0x36: "sh",
  0x37: "sh",
  0x38: "s",
  0x39: "h",
  0x58: "q",
  0x59: "kh",
  0x5a: "g",
  0x5b: "z",
  0x5c: "r",
  0x5d: "rh",
  0x5e: "f",
  0x5f: "y",
};
/** The same consonant with a nukta under it. */
const NUKTA: Record<number, string> = {
  0x15: "q",
  0x16: "kh",
  0x17: "g",
  0x1c: "z",
  0x21: "r",
  0x22: "rh",
  0x2b: "f",
  0x2f: "y",
};
const VOWELS: Record<number, string> = {
  0x05: "a",
  0x06: "aa",
  0x07: "i",
  0x08: "ii",
  0x09: "u",
  0x0a: "uu",
  0x0b: "ri",
  0x0d: "e",
  0x0e: "e",
  0x0f: "e",
  0x10: "ai",
  0x11: "o",
  0x12: "o",
  0x13: "o",
  0x14: "au",
};
const MATRAS: Record<number, string> = {
  0x3e: "aa",
  0x3f: "i",
  0x40: "ii",
  0x41: "u",
  0x42: "uu",
  0x43: "ri",
  0x45: "e",
  0x46: "e",
  0x47: "e",
  0x48: "ai",
  0x49: "o",
  0x4a: "o",
  0x4b: "o",
  0x4c: "au",
};
const VIRAMA = 0x4d;
const NUKTA_SIGN = 0x3c;

/** Offset of `cp` inside its 128-code-point Indic block, or -1 outside Devanagari…Malayalam. */
function indicOffset(cp: number): number {
  return cp >= 0x0900 && cp <= 0x0d7f ? (cp - 0x0900) % 0x80 : -1;
}

/** Indic-script text in rough Latin letters; anything else passes through. */
export function romanizeIndic(text: string): string {
  const cps = [...text].map((ch) => ch.codePointAt(0) ?? 0);
  let out = "";
  for (let i = 0; i < cps.length; i++) {
    const off = indicOffset(cps[i]);
    if (off < 0) {
      out += String.fromCodePoint(cps[i]);
      continue;
    }
    const nukta = indicOffset(cps[i + 1] ?? 0) === NUKTA_SIGN;
    const consonant = (nukta ? NUKTA[off] : undefined) ?? CONSONANTS[off];
    if (consonant) {
      out += consonant;
      const nextOff = indicOffset(cps[i + (nukta ? 2 : 1)] ?? 0);
      if (nukta) {
        i++;
      }
      // The inherent vowel, unless a matra or virama follows.
      if (
        nextOff < 0 ||
        (MATRAS[nextOff] === undefined && nextOff !== VIRAMA)
      ) {
        out += "a";
      }
      continue;
    }
    if (VOWELS[off]) {
      out += VOWELS[off];
    } else if (MATRAS[off]) {
      out += MATRAS[off];
    } else if (off === 0x02 || off === 0x01) {
      out += "n";
    } else if (off === 0x03) {
      out += "h";
    } else if (off === 0x64 || off === 0x65) {
      out += ".";
    } else if (off >= 0x66 && off <= 0x6f) {
      out += String(off - 0x66);
    }
  }
  return out;
}

/**
 * A word's consonant skeleton: digraphs folded, voicing pairs merged
 * (t/d, k/g, p/b are where an accent and a script disagree most), vowels and
 * h dropped, repeats collapsed. "meeting" and "मीटिंग" both give "mtnk".
 */
export function phoneticKey(word: string): string {
  let w = romanizeIndic(word)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/gu, "");
  w = w
    .replace(/chh|ch/gu, "c")
    .replace(/ck/gu, "k")
    .replace(/qu/gu, "kv")
    .replace(/ph/gu, "f")
    .replace(/sh/gu, "s")
    .replace(/x/gu, "ks")
    .replace(/([kgbtdj])h/gu, "$1")
    .replace(/[dt]/gu, "t")
    .replace(/[gkcq]/gu, "k")
    .replace(/[bp]/gu, "p")
    .replace(/[zj]/gu, "j")
    .replace(/w/gu, "v")
    .replace(/[aeiouyh]/gu, "");
  return w.replace(/(.)\1+/gu, "$1") || "_";
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Whether two skeletons sound alike: equal, or one edit apart on three or more consonants (two on six). */
export function soundsAlike(a: string, b: string): boolean {
  if (a === b) {
    return a !== "_";
  }
  const n = Math.max(a.length, b.length);
  if (n < 3) {
    return false;
  }
  return editDistance(a, b) <= (n >= 6 ? 2 : 1);
}

function wordsOf(text: string): string[] {
  return text
    .split(/\s+/u)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

/**
 * Align two readings word by word (Needleman–Wunsch on skeletons): a pair
 * for every word of either side, matched where the words sound alike.
 */
export function alignReadings(
  indic: readonly string[],
  latin: readonly string[],
): STTWordPair[] {
  const ka = indic.map(phoneticKey);
  const kb = latin.map(phoneticKey);
  const n = ka.length;
  const m = kb.length;
  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;
  const score: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    score[i][0] = i * GAP;
  }
  for (let j = 1; j <= m; j++) {
    score[0][j] = j * GAP;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = soundsAlike(ka[i - 1], kb[j - 1]) ? MATCH : MISMATCH;
      score[i][j] = Math.max(
        score[i - 1][j - 1] + s,
        score[i - 1][j] + GAP,
        score[i][j - 1] + GAP,
      );
    }
  }
  const pairs: STTWordPair[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const alike = soundsAlike(ka[i - 1], kb[j - 1]);
      if (score[i][j] === score[i - 1][j - 1] + (alike ? MATCH : MISMATCH)) {
        pairs.push({ indic: indic[i - 1], latin: latin[j - 1], alike });
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && score[i][j] === score[i - 1][j] + GAP) {
      pairs.push({ indic: indic[i - 1], alike: false });
      i--;
    } else {
      pairs.push({ latin: latin[j - 1], alike: false });
      j--;
    }
  }
  return pairs.reverse();
}

/**
 * How much of an utterance two readings agree is English: the share of the
 * Indic engine's words with a phonetic partner in the English-oriented
 * engine's text. Near 1 for English an Indic engine wrote phonetically; well
 * under it for code-mixed speech, where the Indian-language words find none.
 */
export function analyzeCodeMix(
  indicText: string,
  latinText: string,
): STTCodeMixAnalysis {
  const a = wordsOf(indicText);
  const b = wordsOf(latinText);
  if (a.length === 0 || b.length === 0) {
    return { englishShare: a.length === 0 ? 1 : 0, words: a.length, pairs: [] };
  }
  const pairs = alignReadings(a, b);
  const matched = pairs.filter((p) => p.alike && p.indic !== undefined).length;
  return { englishShare: matched / a.length, words: a.length, pairs };
}
