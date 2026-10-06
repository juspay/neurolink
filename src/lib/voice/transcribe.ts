/**
 * Batch transcription orchestration behind `neurolink.transcribe()`:
 *
 *   load audio → resolve provider → transcribe (+ second opinion in parallel)
 *   → fallback → correction → TranscribeResult
 *
 * Everything that touches the SDK (handlers, credentials, `tryDecide`, the
 * rewrite model) arrives through `TranscribeDeps`, so this module stays free
 * of provider plumbing. Nothing here may lose words: a failed second opinion
 * or fallback keeps the primary text, and a correction that comes back empty
 * keeps the engine text.
 *
 * @module voice/transcribe
 */

import { promises as fs } from "fs";
import { extname } from "path";
import { fileURLToPath } from "url";
import type {
  STTDictionaryEntry,
  STTLanguageScore,
  STTOptions,
  STTResult,
  TranscribeAudioInput,
  TranscribeDeps,
  TranscribeOptions,
  TranscribeResult,
  TranscribeTimings,
  TTSAudioFormat,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import { detectAudioFormat } from "./audio-utils.js";
import {
  correctTranscript,
  correctTranscriptLines,
  isCorrectionEnabled,
} from "./correction/index.js";

/** `NEUROLINK_STT_CORRECT_WHOLE=1` forces one whole-transcript rewrite even for segmented results. */
function correctionLinesDisabled(): boolean {
  const v = process.env.NEUROLINK_STT_CORRECT_WHOLE?.trim().toLowerCase();
  return v === "1" || v === "true";
}
import { STTError } from "./errors.js";

/** Default timeout for fetching an `http(s)://` audio input. */
const URL_FETCH_TIMEOUT_MS = 60_000;

/** Container names an extension or magic number can map to. */
const KNOWN_FORMATS: readonly TTSAudioFormat[] = [
  "mp3",
  "wav",
  "ogg",
  "opus",
  "m4a",
  "flac",
  "webm",
  "mp4",
  "mpeg",
  "mpga",
];

// ============================================================================
// AUDIO INPUT
// ============================================================================

/** True for an async stream of frames, which only `transcribeStream()` takes. */
function isAsyncIterableInput(
  input: TranscribeAudioInput,
): input is AsyncIterable<Buffer | Uint8Array> {
  return (
    typeof input === "object" &&
    input !== null &&
    !Buffer.isBuffer(input) &&
    !(input instanceof ArrayBuffer) &&
    !(input instanceof Uint8Array) &&
    Symbol.asyncIterator in input
  );
}

/** The container a path or URL names by its extension, if it is a known one. */
export function audioFormatFromName(name: string): TTSAudioFormat | undefined {
  const ext = extname(name.split(/[?#]/, 1)[0] ?? name)
    .slice(1)
    .toLowerCase();
  const normalized = ext === "oga" ? "ogg" : ext;
  return KNOWN_FORMATS.find((format) => format === normalized);
}

/**
 * The container a buffer's leading bytes identify: WAV, MP3 and Ogg via the
 * shared detector, plus FLAC, WebM/Matroska and ISO-BMFF (m4a/mp4).
 */
export function audioFormatFromBytes(
  buffer: Buffer,
): TTSAudioFormat | undefined {
  const detected = detectAudioFormat(buffer);
  if (detected) {
    return detected;
  }
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).toString("ascii") === "fLaC"
  ) {
    return "flac";
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "webm";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    return "m4a";
  }
  return undefined;
}

/**
 * Read a batch audio input into a Buffer: bytes as they are, a local path or
 * `file://` URL from disk, an `http(s)://` URL over the network. A format
 * implied by the path or URL is returned alongside.
 *
 * @throws STTError when the input is a frame stream, or cannot be read
 */
export async function loadTranscribeAudio(
  input: TranscribeAudioInput,
  timeoutMs?: number,
): Promise<{ buffer: Buffer; formatHint?: TTSAudioFormat }> {
  if (Buffer.isBuffer(input)) {
    return { buffer: input };
  }
  if (input instanceof ArrayBuffer) {
    return { buffer: Buffer.from(input) };
  }
  if (input instanceof Uint8Array) {
    return {
      buffer: Buffer.from(input.buffer, input.byteOffset, input.byteLength),
    };
  }
  if (typeof input !== "string") {
    if (isAsyncIterableInput(input)) {
      throw STTError.streamInputNotSupported();
    }
    throw STTError.audioLoadFailed(
      "expected a Buffer, ArrayBuffer, Uint8Array, path or URL",
    );
  }

  const source = input.trim();
  if (/^https?:\/\//i.test(source)) {
    const controller = new AbortController();
    const limit = timeoutMs ?? URL_FETCH_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), limit);
    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) {
        throw STTError.audioLoadFailed(
          `fetching the audio URL returned HTTP ${response.status}`,
        );
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        buffer,
        formatHint: audioFormatFromName(new URL(source).pathname),
      };
    } catch (error) {
      if (error instanceof STTError) {
        throw error;
      }
      const aborted = error instanceof Error && error.name === "AbortError";
      throw STTError.audioLoadFailed(
        aborted
          ? `fetching the audio URL timed out after ${limit}ms`
          : `fetching the audio URL failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  let path: string;
  try {
    path = /^file:/i.test(source) ? fileURLToPath(source) : source;
  } catch (error) {
    throw STTError.audioLoadFailed(
      "the file: URL is not a valid local path",
      error instanceof Error ? error : undefined,
    );
  }
  try {
    return {
      buffer: await fs.readFile(path),
      formatHint: audioFormatFromName(path),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    throw STTError.audioLoadFailed(
      code === "ENOENT"
        ? "no file at the given path"
        : `reading the file failed${code ? ` (${code})` : ""}`,
      error instanceof Error ? error : undefined,
    );
  }
}

// ============================================================================
// OPTIONS
// ============================================================================

/** `undefined` for "let the engine detect" (omitted, empty or "auto"). */
function normalizeLanguage(language: string | undefined): string | undefined {
  const trimmed = language?.trim();
  return trimmed && trimmed.toLowerCase() !== "auto" ? trimmed : undefined;
}

/** Dictionary terms merged into the caller's vocabulary, without duplicates. */
function mergeVocabulary(
  vocabulary: string[] | undefined,
  dictionary: STTDictionaryEntry[] | undefined,
): string[] | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [
    ...(vocabulary ?? []),
    ...(dictionary ?? []).map((entry) => entry.term),
  ]) {
    const trimmed = typeof term === "string" ? term.trim() : "";
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      out.push(trimmed);
    }
  }
  return out.length > 0 ? out : undefined;
}

/**
 * The handler options for one engine. Fields only the orchestration reads
 * (dictionary, correction, fallback, streaming, credentials) are dropped;
 * the correction context rides along in the prompt for engines that take one.
 */
export function buildEngineOptions(
  options: Omit<TranscribeOptions, "audio">,
  format: TTSAudioFormat | undefined,
  model: string | undefined,
): STTOptions {
  const {
    provider: _provider,
    model: _model,
    language,
    format: _format,
    prompt,
    dictionary,
    correction,
    fallback: _fallback,
    streaming: _streaming,
    credentials: _credentials,
    vocabulary,
    ...rest
  } = options;
  const contextPrompt = [prompt?.trim(), correction?.context?.trim()]
    .filter((part): part is string => !!part)
    .join(" ");
  const engineOptions: STTOptions = { ...rest };
  const resolvedLanguage = normalizeLanguage(language);
  if (resolvedLanguage) {
    engineOptions.language = resolvedLanguage;
  }
  if (format) {
    engineOptions.format = format;
  }
  if (model) {
    engineOptions.model = model;
  }
  if (contextPrompt) {
    engineOptions.prompt = contextPrompt;
  }
  const mergedVocabulary = mergeVocabulary(vocabulary, dictionary);
  if (mergedVocabulary) {
    engineOptions.vocabulary = mergedVocabulary;
  }
  return engineOptions;
}

/** Whether the correction layer runs — the one rule shared with the correction layer and the stream. */
function correctionWanted(options: TranscribeOptions): boolean {
  return isCorrectionEnabled(options.dictionary, options.correction);
}

// ============================================================================
// RESULT HELPERS
// ============================================================================

/** `metadata.languageDetected`, when the engine reported one. */
function readLanguageDetected(result: STTResult): boolean | undefined {
  const value = result.metadata?.languageDetected;
  return typeof value === "boolean" ? value : undefined;
}

/** `metadata.languageScores`, keeping only well-formed entries. */
function readLanguageScores(result: STTResult): STTLanguageScore[] | undefined {
  const value = result.metadata?.languageScores;
  if (!Array.isArray(value)) {
    return undefined;
  }
  const scores: STTLanguageScore[] = [];
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      "language" in entry &&
      "score" in entry &&
      typeof entry.language === "string" &&
      typeof entry.score === "number" &&
      Number.isFinite(entry.score)
    ) {
      scores.push({ language: entry.language, score: entry.score });
    }
  }
  return scores.length > 0 ? scores : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The model an engine reported, else the one that was asked for. */
function reportedModel(
  result: STTResult,
  requested: string | undefined,
): string | undefined {
  const model = result.metadata?.model;
  return typeof model === "string" ? model : requested;
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

/**
 * Transcribe one recording with every configured layer. See the module
 * comment for the order of operations.
 *
 * @throws STTError when the audio cannot be loaded, the provider is unknown,
 *   or the primary engine fails with no fallback that covers errors
 */
export async function runTranscribe(
  options: TranscribeOptions,
  deps: TranscribeDeps,
): Promise<TranscribeResult> {
  const startedAt = Date.now();
  const span = SpanSerializer.createSpan(SpanType.STT, "stt.transcribe", {
    "stt.operation": "transcribe",
    "stt.provider": options.provider,
    "stt.language": options.language,
    "stt.format": options.format,
  });

  try {
    const result = await transcribeLayers(options, deps, startedAt);
    const endedSpan = SpanSerializer.endSpan(
      SpanSerializer.updateAttributes(span, {
        "stt.provider": result.engine.provider,
        "stt.fallback_used": result.engine.fallbackUsed === true,
        "stt.corrected": result.corrected !== undefined,
      }),
      SpanStatus.OK,
    );
    getMetricsAggregator().recordSpan(endedSpan);
    return result;
  } catch (error) {
    const endedSpan = SpanSerializer.endSpan(
      span,
      SpanStatus.ERROR,
      errorMessage(error),
    );
    getMetricsAggregator().recordSpan(endedSpan);
    throw error;
  }
}

async function transcribeLayers(
  options: TranscribeOptions,
  deps: TranscribeDeps,
  startedAt: number,
): Promise<TranscribeResult> {
  const steps: string[] = [];

  // 1. Audio, and its container when the caller did not name one.
  const { buffer, formatHint } = await loadTranscribeAudio(
    options.audio,
    options.timeoutMs,
  );
  if (buffer.length === 0) {
    throw STTError.audioEmpty(options.provider);
  }
  const format = options.format ?? formatHint ?? audioFormatFromBytes(buffer);

  // 2. Engines. A model from the environment only applies to the provider
  // the environment picked; an explicit provider gets only an explicit model.
  const explicitProvider = !!options.provider?.trim();
  const provider = deps.resolveProvider(options.provider);
  const envModel = process.env.NEUROLINK_STT_MODEL?.trim() || undefined;
  const primaryModel =
    options.model ?? (explicitProvider ? undefined : envModel);
  const engineBase: Omit<TranscribeOptions, "audio"> = {
    ...options,
    language: options.language ?? process.env.NEUROLINK_STT_LANGUAGE,
  };
  const optionsFor = (model: string | undefined): STTOptions =>
    buildEngineOptions(engineBase, format, model);

  // 3. Primary and second opinion, in parallel.
  const secondOpinionSpec = options.correction?.secondOpinion;
  const secondProvider = secondOpinionSpec
    ? deps.resolveProvider(secondOpinionSpec.provider)
    : undefined;
  const secondStarted = Date.now();
  const secondPromise: Promise<
    { result: STTResult; ms: number } | { error: unknown; ms: number }
  > | null =
    secondProvider && secondOpinionSpec
      ? deps
          .transcribe(
            buffer,
            secondProvider,
            optionsFor(secondOpinionSpec.model),
          )
          .then(
            (result) => ({ result, ms: Date.now() - secondStarted }),
            (error: unknown) => ({ error, ms: Date.now() - secondStarted }),
          )
      : null;

  const primaryStarted = Date.now();
  const fallback = options.fallback;
  const fallbackWhen = new Set(fallback?.when ?? ["unsure", "empty"]);
  const fallbackProvider = fallback
    ? deps.resolveProvider(fallback.provider)
    : undefined;

  let primary: STTResult | undefined;
  let primaryError: unknown;
  try {
    primary = await deps.transcribe(buffer, provider, optionsFor(primaryModel));
  } catch (error) {
    primaryError = error;
  }

  // 4. Fallback: on error, on an empty transcript, or when the engine said
  // it could not identify the language — whichever `when` asks for.
  let chosen = primary;
  let chosenProvider = provider;
  let chosenModel = primaryModel;
  let fallbackUsed = false;
  const fallbackReason =
    primaryError !== undefined
      ? fallbackWhen.has("error")
        ? "error"
        : undefined
      : primary && !primary.text.trim() && fallbackWhen.has("empty")
        ? "empty"
        : primary &&
            readLanguageDetected(primary) === false &&
            fallbackWhen.has("unsure")
          ? "unsure"
          : undefined;

  if (fallback && fallbackProvider && fallbackReason) {
    if (fallbackProvider === provider && fallback.model === primaryModel) {
      steps.push(`fallback skipped · same engine as primary`);
    } else {
      try {
        const fallbackResult = await deps.transcribe(
          buffer,
          fallbackProvider,
          optionsFor(fallback.model),
        );
        if (fallbackResult.text.trim() || !primary?.text.trim()) {
          chosen = fallbackResult;
          chosenProvider = fallbackProvider;
          chosenModel = fallback.model;
          fallbackUsed = true;
          steps.push(`fallback ${fallbackProvider} (${fallbackReason})`);
        } else {
          steps.push(`fallback ${fallbackProvider} empty · kept primary`);
        }
      } catch (error) {
        steps.push(`fallback ${fallbackProvider} failed · kept primary`);
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribe] fallback ${fallbackProvider} failed: ${errorMessage(error)}`,
          );
        }
      }
    }
  }

  if (!chosen) {
    // Primary failed and nothing replaced it. Let the second opinion settle
    // first so its request is not left running unobserved.
    await secondPromise;
    throw primaryError instanceof Error
      ? primaryError
      : STTError.transcriptionFailed(errorMessage(primaryError), provider);
  }
  const transcribeMs = Date.now() - primaryStarted;
  steps.unshift(`transcribed ${chosenProvider}`);

  // 5. Second opinion.
  let secondText: string | undefined;
  let secondOpinionMs: number | undefined;
  if (secondPromise && secondProvider) {
    const settled = await secondPromise;
    secondOpinionMs = settled.ms;
    if (fallbackUsed && secondProvider === chosenProvider) {
      // The fallback already produced the text with this very engine; a
      // "second opinion" from it would be the same transcript twice.
      steps.push(
        `second opinion ${secondProvider} skipped · it is the fallback`,
      );
    } else if ("result" in settled) {
      secondText = settled.result.text.trim() || undefined;
      steps.push(
        secondText
          ? `second opinion ${secondProvider}`
          : `second opinion ${secondProvider} empty`,
      );
    } else {
      steps.push(`second opinion ${secondProvider} failed`);
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribe] second opinion ${secondProvider} failed: ${errorMessage(settled.error)}`,
        );
      }
    }
  }

  // 6. Correction. The primary text leads unless the primary engine said it
  // could not identify the language and a second opinion exists.
  const languageDetected = readLanguageDetected(chosen);
  const languageScores = readLanguageScores(chosen);
  const engineText = chosen.text;
  const secondLeads = languageDetected === false && !!secondText;
  const raw = secondLeads && secondText ? secondText : engineText;

  let finalText = raw;
  let decisions: TranscribeResult["decisions"];
  const correctionTimings: Pick<
    TranscribeTimings,
    "decideMs" | "rewriteMs" | "correctionMs"
  > = {};

  // A multi-segment transcript (diarized turns, long files) is corrected
  // segment by segment so speakers and timings stay aligned with the text;
  // a second opinion is whole-transcript and keeps the single-text path.
  const segmentTexts = chosen.segments?.map((seg) => seg.text) ?? [];
  const perSegment =
    segmentTexts.length > 1 && !secondText && !correctionLinesDisabled();
  let correctedSegments: typeof chosen.segments | undefined;

  if (correctionWanted(options) && perSegment && chosen.segments) {
    try {
      const corrected = await correctTranscriptLines(
        segmentTexts,
        options.dictionary,
        options.correction,
        deps,
      );
      decisions = corrected.decisions;
      steps.push(...corrected.steps);
      Object.assign(correctionTimings, corrected.timings);
      correctedSegments = chosen.segments.map((seg, i) => ({
        ...seg,
        text: corrected.lines[i]?.trim() || seg.text,
      }));
      const joined = correctedSegments
        .map((seg) => seg.text)
        .filter(Boolean)
        .join(" ");
      if (joined.trim()) {
        finalText = joined;
      } else {
        steps.push("correction returned nothing · kept text");
      }
    } catch (error) {
      steps.push("correction failed · kept text");
      correctedSegments = undefined;
      if (logger.shouldLog("debug")) {
        logger.debug(`[transcribe] correction failed: ${errorMessage(error)}`);
      }
    }
  } else if (correctionWanted(options)) {
    try {
      const corrected = await correctTranscript(
        {
          text: engineText,
          ...(secondText ? { secondOpinion: secondText } : {}),
          ...(options.dictionary ? { dictionary: options.dictionary } : {}),
          ...(options.correction ? { options: options.correction } : {}),
          ...(languageDetected !== undefined ? { languageDetected } : {}),
        },
        deps,
      );
      decisions = corrected.decisions;
      steps.push(...corrected.steps);
      Object.assign(correctionTimings, corrected.timings);
      if (corrected.text.trim()) {
        finalText = corrected.text;
      } else {
        steps.push("correction returned nothing · kept text");
      }
    } catch (error) {
      steps.push("correction failed · kept text");
      if (logger.shouldLog("debug")) {
        logger.debug(`[transcribe] correction failed: ${errorMessage(error)}`);
      }
    }
  } else if (secondLeads) {
    steps.push("second opinion leads (primary language unsure)");
  }

  // 7. Result.
  const { text: _engineText, ...chosenRest } = chosen;
  const result: TranscribeResult = {
    ...chosenRest,
    ...(correctedSegments ? { segments: correctedSegments } : {}),
    text: finalText,
    raw,
    ...(finalText !== raw ? { corrected: finalText } : {}),
    ...(languageDetected !== undefined ? { languageDetected } : {}),
    ...(languageScores ? { languageScores } : {}),
    ...(decisions && decisions.length > 0 ? { decisions } : {}),
    engine: {
      provider: chosenProvider,
      ...(reportedModel(chosen, chosenModel)
        ? { model: reportedModel(chosen, chosenModel) }
        : {}),
      ...(fallbackUsed ? { fallbackUsed: true } : {}),
      ...(secondText && secondProvider
        ? { secondOpinion: secondProvider }
        : {}),
    },
    timings: {
      transcribeMs,
      ...(secondOpinionMs !== undefined ? { secondOpinionMs } : {}),
      ...correctionTimings,
      totalMs: Date.now() - startedAt,
    },
    steps,
  };

  if (logger.shouldLog("debug")) {
    logger.debug(
      `[transcribe] ${chosenProvider}: ${raw.length} chars raw, ${finalText.length} final in ${result.timings.totalMs}ms`,
      { steps },
    );
  }
  return result;
}
