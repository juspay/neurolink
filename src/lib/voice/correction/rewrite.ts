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
import { dictionaryBlock } from "./dictionary.js";
import type {
  STTCorrectionDeps,
  STTCorrectionOptions,
  STTDictionaryEntry,
  STTRewriteLinesOutcome,
  STTRewriteOutcome,
} from "../../types/index.js";

/** Default per-call rewrite timeout; on expiry the input text is kept. */
export const DEFAULT_REWRITE_TIMEOUT_MS = 12000;
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
}): string {
  const transliterate = options?.transliterate ?? "latin";
  const punctuate = options?.punctuate ?? true;
  const lines = options?.lines ?? false;
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
  if (lines) {
    rules.push(
      "- Also fix near-homophones that make no sense in context when the intended word is obvious.",
    );
  }
  rules.push(
    punctuate
      ? "- Add natural punctuation and capitalization; write numbers as digits; keep fillers."
      : "- Do not add or change punctuation or capitalization; keep fillers.",
  );
  rules.push(
    lines
      ? "- Keep every word: never summarize, add, drop, reorder or merge. Keep any speaker label at the " +
          "start of a line unchanged. A line that needs no change is returned verbatim."
      : "- Keep every word: never summarize, add, drop or reorder. With two transcripts, take " +
          "Indian-language words from the one that has them in an Indian language and English words " +
          "from the one that spells them in English; elsewhere prefer Transcript 1.",
  );

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
  },
): string {
  const second = secondOpinion?.trim();
  const body = second
    ? `Transcript 1 (${extras?.labels?.primary ?? "primary engine"}): ${primary}\n` +
      `Transcript 2 (${extras?.labels?.secondary ?? "second engine"}): ${second}`
    : `Transcript: ${primary}`;
  const literal = [...new Set(extras?.literal ?? [])].filter(Boolean);
  return literal.length
    ? `${body}\nMeant literally here, not dictionary terms: ${literal.map((w) => `"${w}"`).join(", ")}`
    : body;
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

function resolveDropRatio(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
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
    onPartial?: (text: string) => void;
  },
  rewrite: STTCorrectionDeps["rewrite"],
): Promise<STTRewriteOutcome> {
  const started = Date.now();
  const { primary, secondOpinion, options } = input;
  const settings = options?.rewrite === false ? undefined : options?.rewrite;
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
          transliterate: options?.transliterate,
          punctuate: options?.punctuate,
          dictionary: input.dictionary,
        }),
        user: buildRewriteUserPrompt(primary, secondOpinion, {
          labels: input.labels,
          literal: input.literal,
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
  if (ratio > resolveDropRatio(options?.maxDropRatio)) {
    return keep("dropped", { dropRatio: ratio });
  }
  return { text, status: "ok", ms: Date.now() - started };
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
  },
): Promise<STTRewriteLinesOutcome> {
  const started = Date.now();
  const out = [...lines];
  const settings =
    options?.correction?.rewrite === false
      ? undefined
      : options?.correction?.rewrite;
  const timeoutMs =
    settings?.timeoutMs && settings.timeoutMs > 0
      ? settings.timeoutMs
      : DEFAULT_REWRITE_LINES_TIMEOUT_MS;
  const maxDrop = resolveDropRatio(options?.correction?.maxDropRatio);
  const system = buildRewriteSystemPrompt({
    transliterate: options?.correction?.transliterate,
    punctuate: options?.correction?.punctuate,
    dictionary: options?.dictionary,
    lines: true,
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
