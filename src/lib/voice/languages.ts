/**
 * Language codes and writing systems for the transcribe pipeline.
 *
 * Engines report languages in different shapes ("hi", "hin", "Hindi",
 * "en-US"); routing, correction and output rendering need one: a lower-case
 * ISO 639 code. Output targets are BCP-47 tags whose script subtag says how
 * the text is written (`hi-Latn` is Hindi in Latin letters), and the guards
 * on a rendering check the text against that script.
 *
 * @module voice/languages
 */

import type { ParsedOutputTag, ScriptCode } from "../types/index.js";

/** Indian languages: the ones the rewrite writes in Latin letters by default. */
const INDIC_LANGUAGES = new Set([
  "as",
  "bn",
  "brx",
  "doi",
  "gu",
  "hi",
  "kn",
  "kok",
  "ks",
  "mai",
  "ml",
  "mni",
  "mr",
  "ne",
  "or",
  "pa",
  "sa",
  "sat",
  "sd",
  "ta",
  "te",
  "ur",
]);

/** English names (and ISO 639-2/3 codes) engines report instead of a 639-1 code. */
const LANGUAGE_ALIASES: Record<string, string> = {
  english: "en",
  eng: "en",
  hindi: "hi",
  hin: "hi",
  bengali: "bn",
  bangla: "bn",
  ben: "bn",
  marathi: "mr",
  mar: "mr",
  gujarati: "gu",
  guj: "gu",
  punjabi: "pa",
  panjabi: "pa",
  pan: "pa",
  odia: "or",
  oriya: "or",
  ori: "or",
  assamese: "as",
  asm: "as",
  urdu: "ur",
  urd: "ur",
  tamil: "ta",
  tam: "ta",
  telugu: "te",
  tel: "te",
  kannada: "kn",
  kan: "kn",
  malayalam: "ml",
  mal: "ml",
  nepali: "ne",
  nep: "ne",
  sanskrit: "sa",
  san: "sa",
  sindhi: "sd",
  kashmiri: "ks",
  konkani: "kok",
  maithili: "mai",
  spanish: "es",
  spa: "es",
  french: "fr",
  fra: "fr",
  german: "de",
  deu: "de",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  japanese: "ja",
  jpn: "ja",
  korean: "ko",
  kor: "ko",
  chinese: "zh",
  mandarin: "zh",
  cantonese: "yue",
  zho: "zh",
  arabic: "ar",
  ara: "ar",
  persian: "fa",
  turkish: "tr",
  dutch: "nl",
  indonesian: "id",
  vietnamese: "vi",
  thai: "th",
};

/**
 * The language part of whatever an engine reported, as a lower-case ISO 639
 * code: "en-US" → "en", "Hindi" → "hi", "auto-ta" → "ta". `undefined` for
 * nothing, "auto" and "und".
 */
export function normalizeLanguageCode(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed || trimmed === "auto" || trimmed === "und") {
    return undefined;
  }
  const bare = trimmed.replace(/^auto[-_]/u, "");
  // Own keys only: "constructor" must not resolve to Object.prototype's.
  if (Object.hasOwn(LANGUAGE_ALIASES, bare)) {
    return LANGUAGE_ALIASES[bare];
  }
  const primary = bare.split(/[-_]/u)[0];
  if (Object.hasOwn(LANGUAGE_ALIASES, primary)) {
    return LANGUAGE_ALIASES[primary];
  }
  return /^[a-z]{2,3}$/u.test(primary) ? primary : undefined;
}

export function isIndicLanguage(language: string | undefined): boolean {
  const code = normalizeLanguageCode(language);
  return code !== undefined && INDIC_LANGUAGES.has(code);
}

/** Letter ranges per script; `Jpan` counts kana and kanji, `Hani` kanji/hanzi only. */
const SCRIPT_RANGES: ReadonlyArray<[ScriptCode, RegExp]> = [
  ["Latn", /\p{Script=Latin}/u],
  ["Deva", /\p{Script=Devanagari}/u],
  ["Beng", /\p{Script=Bengali}/u],
  ["Guru", /\p{Script=Gurmukhi}/u],
  ["Gujr", /\p{Script=Gujarati}/u],
  ["Orya", /\p{Script=Oriya}/u],
  ["Taml", /\p{Script=Tamil}/u],
  ["Telu", /\p{Script=Telugu}/u],
  ["Knda", /\p{Script=Kannada}/u],
  ["Mlym", /\p{Script=Malayalam}/u],
  ["Sinh", /\p{Script=Sinhala}/u],
  ["Arab", /\p{Script=Arabic}/u],
  ["Cyrl", /\p{Script=Cyrillic}/u],
  ["Grek", /\p{Script=Greek}/u],
  ["Hebr", /\p{Script=Hebrew}/u],
  ["Thai", /\p{Script=Thai}/u],
  ["Hang", /\p{Script=Hangul}/u],
  ["Jpan", /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ["Hani", /\p{Script=Han}/u],
  ["Geor", /\p{Script=Georgian}/u],
  ["Armn", /\p{Script=Armenian}/u],
  ["Ethi", /\p{Script=Ethiopic}/u],
];

/** The script a language is written in when no script subtag says otherwise. */
const DEFAULT_SCRIPT: Record<string, ScriptCode> = {
  hi: "Deva",
  mr: "Deva",
  ne: "Deva",
  sa: "Deva",
  mai: "Deva",
  kok: "Deva",
  doi: "Deva",
  brx: "Deva",
  bn: "Beng",
  as: "Beng",
  mni: "Beng",
  pa: "Guru",
  gu: "Gujr",
  or: "Orya",
  ta: "Taml",
  te: "Telu",
  kn: "Knda",
  ml: "Mlym",
  si: "Sinh",
  ur: "Arab",
  ar: "Arab",
  fa: "Arab",
  ps: "Arab",
  sd: "Arab",
  ks: "Arab",
  ru: "Cyrl",
  uk: "Cyrl",
  bg: "Cyrl",
  sr: "Cyrl",
  mk: "Cyrl",
  be: "Cyrl",
  kk: "Cyrl",
  el: "Grek",
  he: "Hebr",
  yi: "Hebr",
  th: "Thai",
  ko: "Hang",
  ja: "Jpan",
  zh: "Hani",
  yue: "Hani",
  ka: "Geor",
  hy: "Armn",
  am: "Ethi",
};

/** Letters of each script in `text`; scripts with none are absent. */
export function scriptCounts(text: string): Map<ScriptCode, number> {
  const counts = new Map<ScriptCode, number>();
  for (const ch of text) {
    for (const [script, re] of SCRIPT_RANGES) {
      if (re.test(ch)) {
        counts.set(script, (counts.get(script) ?? 0) + 1);
        break;
      }
    }
  }
  return counts;
}

/** The script most letters of `text` are in, `undefined` for text without letters. */
export function dominantScript(text: string): ScriptCode | undefined {
  let best: ScriptCode | undefined;
  let bestCount = 0;
  for (const [script, count] of scriptCounts(text)) {
    if (count > bestCount) {
      best = script;
      bestCount = count;
    }
  }
  return best;
}

const INDIC_SCRIPT =
  /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}]/u;

/** Whether `text` holds letters of an Indic script (Devanagari through Sinhala). */
export function hasIndicScript(text: string): boolean {
  return INDIC_SCRIPT.test(text);
}

/**
 * A BCP-47 output tag: language, optional script, optional region
 * (`es`, `fr-CA`, `hi-Latn`, `zh-Hant`). `undefined` for anything else.
 */
export function parseOutputTag(tag: string): ParsedOutputTag | undefined {
  const match =
    /^([a-z]{2,3})(?:-([A-Za-z]{4}))?(?:-([A-Za-z]{2}|\d{3}))?$/iu.exec(
      tag.trim(),
    );
  if (!match) {
    return undefined;
  }
  const language = match[1].toLowerCase();
  const subtag = match[2]
    ? `${match[2][0].toUpperCase()}${match[2].slice(1).toLowerCase()}`
    : undefined;
  // Traditional and Simplified Chinese are both Han for the guard.
  const script: ScriptCode | undefined =
    subtag === "Hant" || subtag === "Hans"
      ? "Hani"
      : (SCRIPT_RANGES.find(([s]) => s === subtag)?.[0] ??
        (subtag ? undefined : (DEFAULT_SCRIPT[language] ?? "Latn")));
  if (!script) {
    return undefined;
  }
  return {
    tag: tag.trim(),
    language,
    script,
    explicitScript: subtag !== undefined,
  };
}

/** Share of `text`'s letters written in `script` (Japanese accepts kanji as well as kana). */
export function scriptShare(text: string, script: ScriptCode): number {
  const counts = scriptCounts(text);
  let total = 0;
  for (const count of counts.values()) {
    total += count;
  }
  if (total === 0) {
    return 1;
  }
  const own =
    (counts.get(script) ?? 0) +
    (script === "Jpan" ? (counts.get("Hani") ?? 0) : 0);
  return own / total;
}

/** "es" → "Spanish", "hi-Latn" → "Hindi (Latin script)"; the tag itself when the runtime cannot name it. */
export function describeOutputTag(tag: string): string {
  const parsed = parseOutputTag(tag);
  if (!parsed) {
    return tag;
  }
  const name = displayName("language", parsed.language);
  if (!parsed.explicitScript) {
    return name;
  }
  return `${name} (${displayName("script", parsed.script)} script)`;
}

/** The English name of a language or script code; the code itself when the runtime has no name for it. */
function displayName(type: "language" | "script", code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}
