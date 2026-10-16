/**
 * LLM rewrite of a transcript: spelling, punctuation, dictionary terms and
 * transliteration, for English, any Indian language, or a mix of the two.
 *
 * The rewrite is a convenience, never a risk to the words:
 * - on timeout (default 12 s) or error the input text is kept;
 * - a rewrite that drops more than `maxDropRatio` (default 0.25) of the words
 *   is discarded — a model that summarises or truncates must not cost words;
 * - the model's answer is the last non-empty line(s), because some models
 *   echo a preamble ("Here is the corrected sentence:") before it;
 * - `maxTokens` is always an integer: a float (`60 + 1.5 × chars` unrounded)
 *   was once rejected with an HTTP 400.
 *
 * The prompt's hardest rule is "never translate": asked to "correct" a
 * Hindi-English sentence, models readily return an English translation, which
 * reads well and loses what was said.
 *
 * @module voice/correction/rewrite
 */

import { TimeoutError, withTimeout } from "../../utils/async/withTimeout.js";
import {
  describeOutputTag,
  hasIndicScript,
  isIndicLanguage,
  normalizeLanguageCode,
} from "../languages.js";
import { analyzeCodeMix } from "../codeMix.js";
import { dictionaryBlock } from "./dictionary.js";
import type {
  STTCorrectionDeps,
  STTCorrectionOptions,
  STTDictionaryEntry,
  STTRewriteLinesOutcome,
  STTRewriteOutcome,
  STTWordPair,
} from "../../types/index.js";

/**
 * The rewrite's provider/model/timeout settings, whatever shape `rewrite`
 * took: `false` and `"auto"` carry none, an object carries its own.
 */
export function rewriteSettings(
  rewrite: STTCorrectionOptions["rewrite"],
): { provider?: string; model?: string; timeoutMs?: number } | undefined {
  return rewrite && typeof rewrite === "object" ? rewrite : undefined;
}

/**
 * Whether the rewrite is wanted for a text, under the "auto" rule: it runs
 * when there is something for it to do and is skipped otherwise, which is
 * what makes an already clean English sentence cost nothing. `"always"`
 * (object form with `mode: "always"`) runs it every time; `false` never.
 */
export function rewriteWanted(
  text: string,
  options: STTCorrectionOptions | undefined,
  signals: {
    /** The rewrite has a second transcript to reconcile. */
    hasSecondOpinion?: boolean;
    /** The dictionary changed something (a term was applied). */
    termsApplied?: number;
    /** Detected language of the speech. */
    language?: string;
  } = {},
): { wanted: boolean; reason: string } {
  const rewrite = options?.rewrite;
  if (rewrite === false) {
    return { wanted: false, reason: "rewrite off" };
  }
  if (typeof rewrite === "object" && rewrite.mode === "always") {
    return { wanted: true, reason: "always" };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return { wanted: false, reason: "empty" };
  }
  if (signals.hasSecondOpinion) {
    return { wanted: true, reason: "second opinion to reconcile" };
  }
  if (options?.cleanup === "clean") {
    return { wanted: true, reason: "clean verbatim" };
  }
  if ((signals.termsApplied ?? 0) > 0) {
    return { wanted: true, reason: "dictionary term applied" };
  }
  const transliterate = resolveTransliterate(options, signals.language);
  if (transliterate === "latin" && needsRomanising(trimmed, signals.language)) {
    return { wanted: true, reason: "romanise" };
  }
  if (options?.punctuate !== false) {
    const words = trimmed.split(/\s+/u).length;
    if (words >= 4 && !TERMINAL_PUNCTUATION.test(trimmed)) {
      return { wanted: true, reason: "punctuate" };
    }
  }
  return { wanted: false, reason: "nothing to change" };
}

/** Any letter outside the Latin blocks (Indic, Arabic, CJK, Cyrillic …). */
const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u;
/** Arabic-script letters, which are Indian-language text only for Urdu, Sindhi and Kashmiri. */
const ARABIC_LETTER = /\p{Script=Arabic}/u;

/**
 * The script setting in effect. Unset, Indian languages (and speech whose
 * language is unknown, as before) are written in Latin letters; any other
 * known language keeps its own script.
 */
export function resolveTransliterate(
  options: Pick<STTCorrectionOptions, "transliterate"> | undefined,
  language: string | undefined,
): "latin" | "native" {
  if (options?.transliterate) {
    return options.transliterate;
  }
  const code = normalizeLanguageCode(language);
  return code && code !== "en" && !isIndicLanguage(code) ? "native" : "latin";
}

/**
 * Whether `text` holds script the Latin setting converts: Indic letters, or
 * Arabic letters when the language is Urdu, Sindhi or Kashmiri, or any
 * non-Latin letters when the caller explicitly asked for Latin output in a
 * language outside India.
 */
function needsRomanising(text: string, language: string | undefined): boolean {
  if (hasIndicScript(text)) {
    return true;
  }
  const code = normalizeLanguageCode(language);
  if (
    ARABIC_LETTER.test(text) &&
    (code === "ur" || code === "sd" || code === "ks")
  ) {
    return true;
  }
  return (
    code !== undefined &&
    code !== "en" &&
    !isIndicLanguage(code) &&
    NON_LATIN_LETTER.test(text)
  );
}

/**
 * Whether the Indian-language prompt applies: Indian languages, English
 * (code-mixed speech is often reported as English) and speech whose language
 * is unknown. Any other known language gets the general prompt.
 */
function indicPrompt(language: string | undefined): boolean {
  const code = normalizeLanguageCode(language);
  return code === undefined || code === "en" || isIndicLanguage(code);
}
/** Ends with a sentence mark, the danda, or a closing quote/bracket after one. */
const TERMINAL_PUNCTUATION = /[.!?\u0964\u0965\u2026][\s"'\u201D\u2019)\]]*$/u;

const DEFAULT_REWRITE_TIMEOUT_MS = 12000;
/** Default per-batch timeout for `rewriteLines`: a batch carries up to 25 lines. */
export const DEFAULT_REWRITE_LINES_TIMEOUT_MS = 60000;
/** Default share of words a rewrite may drop before it is discarded. */
export const DEFAULT_MAX_DROP_RATIO = 0.25;
/** Lines per request in `rewriteLines`. */
export const REWRITE_LINES_BATCH = 25;
/** Batches of `rewriteLines` in flight at once. */
const REWRITE_LINES_CONCURRENCY = 4;
/** Ceiling on `maxTokens` for any one rewrite request. */
const MAX_REWRITE_TOKENS = 4096;

/**
 * Output budget: ~1.5 tokens per input character plus a fixed allowance,
 * capped. Generous on purpose — transliterated Indic text takes more tokens
 * than its source script — and rounded, because a float is a 400 on at least
 * one OpenAI-compatible server.
 */
export function rewriteMaxTokens(inputChars: number): number {
  return Math.min(
    MAX_REWRITE_TOKENS,
    Math.max(1, Math.ceil(60 + 1.5 * Math.max(0, inputChars))),
  );
}

/** Words for the drop guard: whitespace tokens that hold a letter or a digit. */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token))
    .length;
}

/**
 * The script rule. Native-script examples appear only for `"latin"`, where
 * they show the conversion; with `"native"` they would invite the model to
 * convert anyway.
 */
function scriptRule(transliterate: "latin" | "native"): string {
  if (transliterate === "native") {
    return (
      "- Indian-language words stay in that language AND in their own script " +
      "(Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, " +
      "Malayalam, Urdu …); never rewrite them in Latin letters. Fix only their spelling."
    );
  }
  return (
    "- Indian-language words stay in that language but are ALWAYS written in Latin " +
    "letters the way people type on phones (Hinglish, Tanglish, Kanglish …): " +
    "मेरा नाम → mera naam; भेज देना → bhej dena; " +
    "நாளைக்கு மீட்டிங் இருக்கு → naalaikku meeting irukku; ಇವತ್ತು → ivattu; " +
    "నేను వస్తాను → nenu vastanu; আমি আসছি → ami aschi. " +
    "No Indic script may remain in the output."
  );
}

/**
 * System prompt for the rewrite. `lines: true` is the batched variant for long
 * transcripts: numbered lines in, the same numbered lines out.
 */
export function buildRewriteSystemPrompt(options?: {
  transliterate?: "latin" | "native";
  punctuate?: boolean;
  dictionary?: readonly STTDictionaryEntry[];
  lines?: boolean;
  cleanup?: "verbatim" | "clean";
  /** Detected language of the speech; a known language outside India gets the general prompt. */
  language?: string;
}): string {
  if (!indicPrompt(options?.language)) {
    return buildGeneralRewriteSystemPrompt(options ?? {});
  }
  const transliterate = options?.transliterate ?? "latin";
  const punctuate = options?.punctuate ?? true;
  const lines = options?.lines ?? false;
  const clean = options?.cleanup === "clean";
  const table = dictionaryBlock(options?.dictionary);

  const rules = [
    scriptRule(transliterate),
    "- NEVER translate. An Indian-language word stays in its language and an English word stays English.",
    "- English words get their correct English spelling (please, before, client, deployment, meeting). " +
      "Never leave an English word spelled phonetically, in any script.",
  ];
  if (table) {
    rules.push(
      '- Use the dictionary: a word or phrase that sounds like a term or one of its "also heard as" forms, ' +
        "and means that term here, is written as the term exactly.",
    );
  }
  // Indic engines mis-hear short words into near-homophones that read as
  // real words (कल "tomorrow" → खाल "skin"); only context reveals them.
  rules.push(
    "- Fix near-homophones that make no sense in context when the intended word is obvious " +
      '(खाल heard where कल, "tomorrow", is meant); never change a word that makes sense as heard.',
  );
  const fillers = clean ? "remove fillers" : "keep fillers";
  rules.push(
    punctuate
      ? `- Add natural punctuation and capitalization; write numbers as digits; ${fillers}.`
      : `- Do not add or change punctuation or capitalization; ${fillers}.`,
  );
  if (clean) {
    rules.push(
      "- Clean verbatim: drop fillers (um, uh, hmm, a 'like' or 'you know' that carries no meaning), " +
        'stutters and immediate word repeats ("they they they" → "they", "no, no, no" → "no"), ' +
        "and false starts that the speaker restarted. Never drop a word that carries meaning, never " +
        "summarize, add or reorder.",
    );
  } else {
    rules.push(
      lines
        ? "- Keep every word: never summarize, add, drop, reorder or merge. Keep any speaker label at the " +
            "start of a line unchanged. A line that needs no change is returned verbatim."
        : "- Keep every word: never summarize, add, drop or reorder. With two transcripts, take " +
            "Indian-language words from the one that has them in an Indian language and English words " +
            "from the one that spells them in English; elsewhere prefer Transcript 1. When a word " +
            "alignment is given, decide word by word: a pair that is the same English word (मीटिंग ≈ meeting) " +
            "is that English word; where the English transcript has an English-sounding guess at an " +
            "Indian-language word (भेज देना | page dinner), keep the Indian-language word. Sounding alike " +
            "is not enough: when the English word makes no sense in the sentence, the speaker said the " +
            'Indian-language word (खाल ≈ Call before "meeting hai" is kal, tomorrow).',
    );
  }
  if (clean && lines) {
    rules.push(
      "- Never merge or reorder lines. Keep any speaker label at the start of a line unchanged.",
    );
  }

  const head = [
    "You are a post-editor for speech-recognition (ASR) transcripts. The speaker talks English, " +
      "an Indian language (Hindi, Bengali, Marathi, Gujarati, Punjabi, Odia, Assamese, Urdu, Tamil, " +
      "Telugu, Kannada, Malayalam, …), or mixes an Indian language with English.",
    lines
      ? "Input: a numbered list of transcript lines, possibly in an Indic script (such engines write " +
        "English words phonetically in that script)."
      : "Input: an ASR transcript, possibly in an Indic script (such engines write English words " +
        "phonetically in that script), and possibly a second transcript of the same audio from another engine.",
    "Write the speaker's words exactly as they said them:",
    ...rules,
    lines
      ? "Output: the same numbered lines, one per input line, nothing else."
      : "Output only the corrected text, nothing else.",
  ].join("\n");

  return table ? `${head}\n\n${table}` : head;
}

/**
 * The rewrite prompt for a known language outside India: fix what the engine
 * got wrong, keep the language and its script (unless Latin letters were
 * asked for), never translate.
 */
function buildGeneralRewriteSystemPrompt(options: {
  transliterate?: "latin" | "native";
  punctuate?: boolean;
  dictionary?: readonly STTDictionaryEntry[];
  lines?: boolean;
  cleanup?: "verbatim" | "clean";
  language?: string;
}): string {
  const code = normalizeLanguageCode(options.language) ?? "und";
  const name = describeOutputTag(code);
  const punctuate = options.punctuate ?? true;
  const lines = options.lines ?? false;
  const clean = options.cleanup === "clean";
  const table = dictionaryBlock(options.dictionary);
  const rules = [
    options.transliterate === "latin"
      ? `- Write ${name} in Latin letters using its standard romanization; keep the words in ${name}.`
      : `- Keep the text in ${name} and in its own writing system; never transliterate it.`,
    `- NEVER translate. A ${name} word stays ${name} and an English word stays English.`,
    "- Fix words the recognizer mis-heard when the intended word is obvious from context; " +
      "English words get their correct English spelling.",
  ];
  if (table) {
    rules.push(
      '- Use the dictionary: a word or phrase that sounds like a term or one of its "also heard as" forms, ' +
        "and means that term here, is written as the term exactly.",
    );
  }
  const fillers = clean ? "remove fillers" : "keep fillers";
  rules.push(
    punctuate
      ? `- Add natural punctuation and capitalization in ${name}'s own conventions; write numbers as digits; ${fillers}.`
      : `- Do not add or change punctuation or capitalization; ${fillers}.`,
  );
  rules.push(
    clean
      ? "- Clean verbatim: drop fillers, stutters, immediate repeats and restarted false starts. " +
          "Never drop a word that carries meaning, never summarize, add or reorder."
      : lines
        ? "- Keep every word: never summarize, add, drop, reorder or merge. Keep any speaker label at the " +
          "start of a line unchanged. A line that needs no change is returned verbatim."
        : "- Keep every word: never summarize, add, drop or reorder. With two transcripts, take each word " +
          "from the one that wrote it correctly; elsewhere prefer Transcript 1.",
  );
  const head = [
    `You are a post-editor for speech-recognition (ASR) transcripts. The speaker talks ${name}, ` +
      "possibly mixed with English.",
    lines
      ? "Input: a numbered list of transcript lines."
      : "Input: an ASR transcript, and possibly a second transcript of the same audio from another engine.",
    "Write the speaker's words exactly as they said them:",
    ...rules,
    lines
      ? "Output: the same numbered lines, one per input line, nothing else."
      : "Output only the corrected text, nothing else.",
  ].join("\n");
  return table ? `${head}\n\n${table}` : head;
}

/**
 * User message for the rewrite. With a second opinion the two transcripts are
 * labelled; `literal` lists aliases the guard decided were meant literally, so
 * the rewrite does not turn them back into dictionary terms.
 */
export function buildRewriteUserPrompt(
  primary: string,
  secondOpinion?: string,
  extras?: {
    labels?: { primary?: string; secondary?: string };
    literal?: readonly string[];
    /** Earlier corrected utterances, oldest first: context the model must not echo. */
    previous?: readonly string[];
    /** The two transcripts aligned word by word (Indic reading against English reading). */
    pairs?: readonly STTWordPair[];
  },
): string {
  const second = secondOpinion?.trim();
  const previous = (extras?.previous ?? [])
    .map((line) => line.trim())
    .filter(Boolean);
  const context = previous.length
    ? "Earlier in this conversation (context only: do not correct, translate or repeat these):\n" +
      previous.map((line) => `- ${line}`).join("\n") +
      "\n\n"
    : "";
  const body = second
    ? `Transcript 1 (${extras?.labels?.primary ?? "primary engine"}): ${primary}\n` +
      `Transcript 2 (${extras?.labels?.secondary ?? "second engine"}): ${second}`
    : `Transcript: ${primary}`;
  const aligned = alignmentBlock(extras?.pairs);
  const literal = [...new Set(extras?.literal ?? [])].filter(Boolean);
  if (aligned) {
    return literal.length
      ? `${context}${body}\n${aligned}\nMeant literally here, not dictionary terms: ${literal.map((w) => `"${w}"`).join(", ")}`
      : `${context}${body}\n${aligned}`;
  }
  return literal.length
    ? `${context}${body}\nMeant literally here, not dictionary terms: ${literal.map((w) => `"${w}"`).join(", ")}`
    : `${context}${body}`;
}

/** Most aligned positions shown to the model. */
const MAX_ALIGNED_PAIRS = 120;
/** Largest word grid (primary × second opinion) aligned for reconciliation: ~500 × 500. */
const MAX_ALIGN_CELLS = 250_000;

/**
 * The word alignment of two transcripts as a prompt block: same-sounding
 * words side by side ("मीटिंग ≈ meeting"), and runs where only one engine
 * heard something, so the rewrite decides word by word which reading holds
 * the speaker's word in which language.
 */
export function alignmentBlock(
  pairs: readonly STTWordPair[] | undefined,
): string | undefined {
  if (!pairs?.length) {
    return undefined;
  }
  const cells = pairs
    .slice(0, MAX_ALIGNED_PAIRS)
    .map((p) =>
      p.alike
        ? `${p.indic} ≈ ${p.latin}`
        : `${p.indic ?? "∅"} | ${p.latin ?? "∅"}`,
    );
  return (
    "Word alignment of the two transcripts, in order (≈ sounds alike, | heard differently, ∅ nothing there):\n" +
    cells.join("; ")
  );
}

/**
 * Word pairs for a reconciliation: the Indic-script transcript aligned
 * against the Latin-script one, whichever order they came in; `undefined`
 * when both are in the same script (nothing to line up across scripts).
 */
export function reconcilePairs(
  primary: string,
  secondOpinion: string | undefined,
): { pairs: STTWordPair[]; englishShare: number } | undefined {
  if (!secondOpinion?.trim()) {
    return undefined;
  }
  const indicFirst = hasIndicScript(primary) && !hasIndicScript(secondOpinion);
  const indicSecond = hasIndicScript(secondOpinion) && !hasIndicScript(primary);
  if (!indicFirst && !indicSecond) {
    return undefined;
  }
  // The alignment is quadratic; a whole long transcript is reconciled
  // without pairs rather than stalling the event loop.
  const cells =
    primary.split(/\s+/u).length * secondOpinion.split(/\s+/u).length;
  if (cells > MAX_ALIGN_CELLS) {
    return undefined;
  }
  const mix = indicFirst
    ? analyzeCodeMix(primary, secondOpinion)
    : analyzeCodeMix(secondOpinion, primary);
  return { pairs: mix.pairs, englishShare: mix.englishShare };
}

/** A label the model may echo in front of its answer ("Transcript 1 (…):"). */
const ECHOED_LABEL_RE =
  /^(?:corrected\s+)?transcript(?:\s*\d+)?(?:\s*\([^)]*\))?\s*:\s*/iu;

/**
 * The model's answer: the last `lineCount` non-empty lines, since a preamble,
 * if any, comes first. An echoed "Transcript:" label is stripped.
 */
export function extractRewrite(content: string, lineCount = 1): string {
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .slice(-Math.max(1, lineCount))
    .map((line) => line.replace(ECHOED_LABEL_RE, "").trim())
    .join("\n")
    .trim();
}

/** Share of `before`'s words missing from `after`, 0 when nothing was dropped. */
function dropRatio(before: string, after: string): number {
  const inWords = countWords(before);
  if (inWords === 0) {
    return 0;
  }
  return Math.max(0, (inWords - countWords(after)) / inWords);
}

/** Share of words a clean-verbatim rewrite may remove when the caller set no `maxDropRatio`. */
const CLEAN_MAX_DROP_RATIO = 0.5;

function resolveDropRatio(
  value: number | undefined,
  cleanup?: "verbatim" | "clean",
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : cleanup === "clean"
      ? CLEAN_MAX_DROP_RATIO
      : DEFAULT_MAX_DROP_RATIO;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Rewrite one transcript (a sentence, an utterance, or a short multi-line
 * text). `primary` is the leading text — already dictionary-applied — and the
 * one the drop guard measures against. Never throws.
 */
export async function rewriteTranscript(
  input: {
    primary: string;
    secondOpinion?: string;
    dictionary?: readonly STTDictionaryEntry[];
    options?: STTCorrectionOptions;
    labels?: { primary?: string; secondary?: string };
    literal?: readonly string[];
    /** Detected language of the speech. */
    language?: string;
    /** Earlier corrected utterances, oldest first. */
    previous?: readonly string[];
    /** The two transcripts aligned word by word (see `reconcilePairs`). */
    pairs?: readonly STTWordPair[];
    onPartial?: (text: string) => void;
  },
  rewrite: STTCorrectionDeps["rewrite"],
): Promise<STTRewriteOutcome> {
  const started = Date.now();
  const { primary, secondOpinion, options } = input;
  const settings = rewriteSettings(options?.rewrite);
  const timeoutMs =
    settings?.timeoutMs && settings.timeoutMs > 0
      ? settings.timeoutMs
      : DEFAULT_REWRITE_TIMEOUT_MS;
  const lineCount = Math.max(
    1,
    primary.split(/\r?\n/u).filter((line) => line.trim()).length,
  );

  // Partials after a timeout would overwrite text the caller already settled.
  let live = true;
  const onPartial = input.onPartial
    ? (partial: string) => {
        if (live) {
          const text = extractRewrite(partial, lineCount);
          if (text) {
            input.onPartial?.(text);
          }
        }
      }
    : undefined;

  const keep = (
    status: STTRewriteOutcome["status"],
    extra?: Partial<STTRewriteOutcome>,
  ): STTRewriteOutcome => ({
    text: primary,
    status,
    ms: Date.now() - started,
    ...extra,
  });

  let content: string;
  try {
    content = await withTimeout(
      rewrite({
        system: buildRewriteSystemPrompt({
          transliterate: resolveTransliterate(options, input.language),
          punctuate: options?.punctuate,
          cleanup: options?.cleanup,
          dictionary: input.dictionary,
          language: input.language,
        }),
        user: buildRewriteUserPrompt(primary, secondOpinion, {
          labels: input.labels,
          literal: input.literal,
          previous: input.previous,
          ...(input.pairs ? { pairs: input.pairs } : {}),
        }),
        provider: settings?.provider,
        model: settings?.model,
        maxTokens: rewriteMaxTokens(
          primary.length + (secondOpinion?.length ?? 0),
        ),
        timeoutMs,
        onPartial,
      }),
      timeoutMs,
    );
  } catch (error) {
    live = false;
    return error instanceof TimeoutError
      ? keep("timeout")
      : keep("error", { error: errorMessage(error) });
  }
  live = false;

  const text = extractRewrite(
    typeof content === "string" ? content : "",
    lineCount,
  );
  if (!text) {
    return keep("empty");
  }
  const ratio = dropRatio(primary, text);
  if (ratio > resolveDropRatio(options?.maxDropRatio, options?.cleanup)) {
    return keep("dropped", { dropRatio: ratio });
  }
  if (addedWords(primary, secondOpinion, text, input.previous)) {
    return keep("added");
  }
  return { text, status: "ok", ms: Date.now() - started };
}

/**
 * Whether a rewrite says more than was spoken: noticeably more words than
 * the longer of the two readings it was given (a model that joins both
 * readings one after the other instead of choosing between them), or a run
 * of six words copied from an earlier utterance that the input does not
 * contain (a model that repeats its context).
 */
function addedWords(
  primary: string,
  secondOpinion: string | undefined,
  output: string,
  previous: readonly string[] | undefined,
): boolean {
  const given = Math.max(countWords(primary), countWords(secondOpinion ?? ""));
  const out = countWords(output);
  if (out > given * 1.3 + 3) {
    return true;
  }
  const norm = (t: string): string[] =>
    t
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/u)
      .filter(Boolean);
  const inputText = ` ${[...norm(primary), ...norm(secondOpinion ?? "")].join(" ")} `;
  const outWords = norm(output);
  for (const line of previous ?? []) {
    const prev = norm(line);
    for (let i = 0; i + 6 <= prev.length; i++) {
      const run = prev.slice(i, i + 6).join(" ");
      if (
        ` ${outWords.join(" ")} `.includes(` ${run} `) &&
        !inputText.includes(` ${run} `)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Run `task` over `items` with at most `limit` in flight; results keep input order. */
async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/** `1. text` / `1) text` in the model's numbered output. */
const NUMBERED_LINE_RE = /^\s*(\d+)[.)]\s?(.*)$/gmu;

/**
 * Batched rewrite for long transcripts (file transcription, diarized turns):
 * 25 numbered lines per request, the same numbers back. A failed or timed-out
 * batch keeps its lines; a line missing from the output, empty, or shorter by
 * more than `maxDropRatio` of its words keeps its input. Blank input lines
 * are never sent and come back as they were. Never throws.
 */
export async function rewriteLines(
  lines: readonly string[],
  rewrite: STTCorrectionDeps["rewrite"],
  options?: {
    dictionary?: readonly STTDictionaryEntry[];
    correction?: STTCorrectionOptions;
    /** Detected language of the recording. */
    language?: string;
  },
): Promise<STTRewriteLinesOutcome> {
  const started = Date.now();
  const out = [...lines];
  const settings = rewriteSettings(options?.correction?.rewrite);
  const timeoutMs =
    settings?.timeoutMs && settings.timeoutMs > 0
      ? settings.timeoutMs
      : DEFAULT_REWRITE_LINES_TIMEOUT_MS;
  const maxDrop = resolveDropRatio(
    options?.correction?.maxDropRatio,
    options?.correction?.cleanup,
  );
  const system = buildRewriteSystemPrompt({
    transliterate: resolveTransliterate(options?.correction, options?.language),
    punctuate: options?.correction?.punctuate,
    cleanup: options?.correction?.cleanup,
    dictionary: options?.dictionary,
    lines: true,
    language: options?.language,
  });

  const indices = lines
    .map((line, index) => (line.trim() ? index : -1))
    .filter((index) => index >= 0);
  const batches: number[][] = [];
  for (let i = 0; i < indices.length; i += REWRITE_LINES_BATCH) {
    batches.push(indices.slice(i, i + REWRITE_LINES_BATCH));
  }

  let linesKept = 0;
  const okFlags = await mapLimited(
    batches,
    REWRITE_LINES_CONCURRENCY,
    async (batch) => {
      const numbered = batch
        .map((index, k) => `${k + 1}. ${lines[index].trim()}`)
        .join("\n");
      let content: string;
      try {
        content = await withTimeout(
          rewrite({
            system,
            user: numbered,
            provider: settings?.provider,
            model: settings?.model,
            maxTokens: rewriteMaxTokens(numbered.length),
            timeoutMs,
          }),
          timeoutMs,
        );
      } catch {
        return false;
      }
      const answers = new Map<number, string>();
      for (const match of String(content ?? "").matchAll(NUMBERED_LINE_RE)) {
        const k = Number(match[1]) - 1;
        const text = match[2].trim();
        if (k >= 0 && k < batch.length && text && !answers.has(k)) {
          answers.set(k, text);
        }
      }
      batch.forEach((index, k) => {
        const text = answers.get(k);
        if (!text) {
          return;
        }
        if (dropRatio(lines[index], text) > maxDrop) {
          linesKept += 1;
          return;
        }
        out[index] = text;
      });
      return answers.size > 0;
    },
  );

  return {
    lines: out,
    batchesOk: okFlags.filter(Boolean).length,
    batches: batches.length,
    linesKept,
    ms: Date.now() - started,
  };
}
