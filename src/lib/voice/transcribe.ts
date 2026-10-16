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
import {
  guardEngineResult,
  promptTermsOf,
  runTranscribeStream,
} from "./transcribeStream.js";
import { ENGINE_SAMPLE_RATE } from "./streaming/endpointer.js";
import { alignWordsToText } from "./correction/align.js";
import { normalizeLanguageCode } from "./languages.js";
import { outputLanguagesOf, renderOutputs } from "./output/render.js";
import type {
  STTDictionaryEntry,
  STTLanguageScore,
  STTOptions,
  STTResult,
  STTStreamingOptions,
  TranscribeAudioInput,
  TranscribeDeps,
  TranscribeOptions,
  TranscribeResult,
  TranscribeStreamCorrectedEvent,
  TranscribeStreamFinalEvent,
  TranscribeStreamOutputEvent,
  STTOutputRendering,
  TranscribeTimings,
  TranscriptionSegment,
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
  correctTranscriptSentences,
  isCorrectionEnabled,
} from "./correction/index.js";
import { STTError } from "./errors.js";

/** Audio the language probe gets to hear; a verdict needs a few seconds, not the file. */
const PROBE_SECONDS = 8;

/**
 * The first `seconds` of a PCM WAV as a smaller WAV, so a language probe
 * uploads kilobytes instead of the whole recording. Anything that is not a
 * plain RIFF/WAVE with a readable `fmt ` and `data` chunk is returned as is.
 */
export function wavHead(buffer: Buffer, seconds: number): Buffer {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return buffer;
  }
  let offset = 12;
  let byteRate = 0;
  let blockAlign = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= buffer.length) {
      byteRate = buffer.readUInt32LE(body + 8);
      blockAlign = buffer.readUInt16LE(body + 12);
    } else if (id === "data") {
      if (!byteRate || !blockAlign) {
        return buffer;
      }
      const available = Math.min(size, buffer.length - body);
      const wanted = Math.floor((byteRate * seconds) / blockAlign) * blockAlign;
      if (available <= wanted) {
        return buffer;
      }
      const head = Buffer.from(buffer.subarray(0, body + wanted));
      head.writeUInt32LE(head.length - 8, 4);
      head.writeUInt32LE(wanted, offset + 4);
      return head;
    }
    offset = body + size + (size % 2);
  }
  return buffer;
}

/** `NEUROLINK_STT_CORRECT_WHOLE=1` forces one whole-transcript rewrite even for segmented results. */
function correctionLinesDisabled(): boolean {
  const v = process.env.NEUROLINK_STT_CORRECT_WHOLE?.trim().toLowerCase();
  return v === "1" || v === "true";
}

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
    routing: _routing,
    chunking: _chunking,
    output: _output,
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

/** 100 ms of 16 kHz PCM16 per frame when a recording is replayed through the live pipeline. */
const UTTERANCE_FRAME_BYTES = 3200;
/** Finals in flight at once on the file path when the caller sets no `streaming.concurrency`. */
const DEFAULT_FILE_CONCURRENCY = 3;
/** Per-engine-call timeout on the file path when the caller sets none. */
const FILE_ENGINE_TIMEOUT_MS = 180_000;
/** File-mode utterance cuts: shorter than live, so a long-form engine stays in its comfortable range and more utterances run in parallel. */
const FILE_MAX_UTTERANCE_SECONDS = 20;
const FILE_SOFT_CUT_SECONDS = 12;

/**
 * The stream options a recording gets when it goes through the live
 * pipeline, whether by `chunking: "utterances"` or over the WebSocket with
 * `mode: "file"`: no interim passes, several utterances at a time, one retry
 * of a failed final, file-sized engine timeouts and shorter cuts. Anything
 * the caller set explicitly is kept.
 */
export function fileModeStreamOptions<
  T extends { streaming?: STTStreamingOptions; timeoutMs?: number },
>(options: T): T {
  return {
    ...options,
    streaming: {
      ...options.streaming,
      // No interim passes on a file: an infinite cadence disables them.
      intervalMs: Number.POSITIVE_INFINITY,
      concurrency: options.streaming?.concurrency ?? DEFAULT_FILE_CONCURRENCY,
      finalRetries: options.streaming?.finalRetries ?? 1,
      maxUtteranceSeconds:
        options.streaming?.maxUtteranceSeconds ?? FILE_MAX_UTTERANCE_SECONDS,
      softCutSeconds:
        options.streaming?.softCutSeconds ?? FILE_SOFT_CUT_SECONDS,
    },
    // Engines get a file-sized timeout: an utterance may be 20 s of audio on
    // a busy gateway, and the live default (30 s) is cut for captions.
    timeoutMs: options.timeoutMs ?? FILE_ENGINE_TIMEOUT_MS,
  };
}

/**
 * The file path that behaves like live captions: the recording is cut into
 * utterances by the endpointer, every utterance gets the language probe and
 * its own engine, the dictionary and the per-sentence correction, several
 * utterances at a time, and the result has one segment per utterance. No
 * interim passes are run; the stream is fed as fast as the engines take it.
 */
async function transcribeUtterances(
  buffer: Buffer,
  format: TTSAudioFormat | undefined,
  options: TranscribeOptions,
  deps: TranscribeDeps,
  startedAt: number,
): Promise<TranscribeResult> {
  const { decodeToWhistlePcm } = await import("./whistle/audio.js");
  const samples = await decodeToWhistlePcm(buffer, format, ENGINE_SAMPLE_RATE);
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    pcm.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      i * 2,
    );
  }
  const duration = samples.length / ENGINE_SAMPLE_RATE;
  async function* frames(): AsyncGenerator<Buffer> {
    for (let at = 0; at < pcm.length; at += UTTERANCE_FRAME_BYTES) {
      yield pcm.subarray(at, Math.min(pcm.length, at + UTTERANCE_FRAME_BYTES));
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  const {
    audio: _audio,
    chunking: _chunking,
    format: _format,
    ...rest
  } = options;
  const provider = deps.resolveProvider(options.provider);
  const fileOptions = fileModeStreamOptions(rest);
  const events = runTranscribeStream(
    {
      ...fileOptions,
      audio: frames(),
      streaming: {
        ...fileOptions.streaming,
        mode: "chunked",
        sampleRate: ENGINE_SAMPLE_RATE,
      },
    },
    deps,
  );

  const finals = new Map<number, TranscribeStreamFinalEvent>();
  const corrections = new Map<number, TranscribeStreamCorrectedEvent>();
  const outputEvents = new Map<
    string,
    Map<number, TranscribeStreamOutputEvent>
  >();
  let lastOutputAt = startedAt;
  const silences: Array<{ utterance: number; seconds: number }> = [];
  const errors: string[] = [];
  let lastFinalAt = startedAt;
  let lastCorrectedAt = startedAt;
  let fatal: string | undefined;
  for await (const ev of events) {
    if (ev.type === "final") {
      finals.set(ev.utterance, ev);
      lastFinalAt = Date.now();
    } else if (ev.type === "corrected") {
      corrections.set(ev.utterance, ev);
      lastCorrectedAt = Date.now();
    } else if (ev.type === "output") {
      const byUtterance = outputEvents.get(ev.language) ?? new Map();
      byUtterance.set(ev.utterance, ev);
      outputEvents.set(ev.language, byUtterance);
      lastOutputAt = Date.now();
    } else if (ev.type === "silence") {
      silences.push({ utterance: ev.utterance, seconds: ev.seconds });
    } else if (ev.type === "error") {
      errors.push(ev.message);
      if (!ev.recoverable) {
        fatal = ev.message;
      }
    }
  }

  // The same contract as a whole-file call: an engine that could not run is
  // an error, not an empty transcript.
  const nothingRead = finals.size === 0 && errors.length > 0;
  if (fatal !== undefined || nothingRead) {
    throw STTError.transcriptionFailed(
      fatal ?? errors[errors.length - 1] ?? "every utterance failed",
      provider,
    );
  }

  const ids = [...finals.keys()].sort((a, b) => a - b);
  const segments: TranscriptionSegment[] = ids.map((id, index) => {
    const f = finals.get(id) as TranscribeStreamFinalEvent;
    const c = corrections.get(id);
    return {
      ...f.segment,
      index,
      text: c?.text.trim() ? c.text : f.text,
      isFinal: true,
      ...(f.language ? { language: f.language } : {}),
    };
  });
  const raw = ids
    .map((id) => finals.get(id)?.text ?? "")
    .filter(Boolean)
    .join(" ");
  const text = segments
    .map((seg) => seg.text)
    .filter(Boolean)
    .join(" ");
  const decisions = ids.flatMap((id) => corrections.get(id)?.decisions ?? []);
  const handedOver = ids.filter((id) => finals.get(id)?.fallbackUsed).length;
  const fallbackProvider = handedOver
    ? (ids.map((id) => finals.get(id)).find((f) => f?.fallbackUsed)?.engine ??
      options.fallback?.provider)
    : undefined;
  const languages = ids
    .map((id) => finals.get(id)?.language)
    .filter((l): l is string => !!l && l !== "und");
  const language = languages.length
    ? [...new Set(languages)].sort(
        (a, b) =>
          languages.filter((l) => l === b).length -
          languages.filter((l) => l === a).length,
      )[0]
    : undefined;
  const unsure = ids.some(
    (id) =>
      finals.get(id)?.languageDetected === false &&
      !finals.get(id)?.fallbackUsed,
  );
  const anyDetected = ids.some(
    (id) => finals.get(id)?.languageDetected !== undefined,
  );
  const steps = [
    `transcribed ${provider} per utterance (${ids.length} utterance${ids.length === 1 ? "" : "s"}${handedOver ? `, ${handedOver} by ${fallbackProvider}` : ""})`,
    ...(silences.length
      ? [
          `${silences.length} utterance(s) no engine could read (${silences.map((g) => `${g.seconds.toFixed(1)} s`).join(", ")}), reported as silence`,
        ]
      : []),
    ...(corrections.size
      ? [`corrected ${corrections.size}/${ids.length} utterances`]
      : []),
    ...(errors.length ? [`${errors.length} recoverable error(s)`] : []),
  ];
  const decideMs = sumTimings(corrections, "decideMs");
  const rewriteMs = sumTimings(corrections, "rewriteMs");
  const outputs = collectUtteranceOutputs(
    outputLanguagesOf(options.output),
    ids,
    outputEvents,
  );
  if (outputs) {
    steps.push(describeOutputs(outputs));
  }
  const result: TranscribeResult = {
    text,
    confidence: 0,
    ...(language ? { language } : {}),
    duration,
    segments,
    raw,
    ...(text !== raw ? { corrected: text } : {}),
    ...(anyDetected ? { languageDetected: !unsure } : {}),
    ...(decisions.length ? { decisions } : {}),
    engine: {
      provider,
      ...(handedOver ? { fallbackUsed: true } : {}),
    },
    timings: {
      transcribeMs: lastFinalAt - startedAt,
      ...(decideMs !== undefined ? { decideMs } : {}),
      ...(rewriteMs !== undefined ? { rewriteMs } : {}),
      ...(corrections.size
        ? { correctionMs: Math.max(0, lastCorrectedAt - lastFinalAt) }
        : {}),
      ...(outputs
        ? { outputMs: Math.max(0, lastOutputAt - lastCorrectedAt) }
        : {}),
      totalMs: Date.now() - startedAt,
    },
    steps,
    ...(outputs ? { outputs } : {}),
  };
  return result;
}

/** One rendering per language from the per-utterance `output` events, in utterance order. */
function collectUtteranceOutputs(
  languages: readonly string[],
  ids: readonly number[],
  events: Map<string, Map<number, TranscribeStreamOutputEvent>>,
): Record<string, STTOutputRendering> | undefined {
  if (languages.length === 0) {
    return undefined;
  }
  const out: Record<string, STTOutputRendering> = {};
  for (const tag of languages) {
    const byUtterance = events.get(tag) ?? new Map();
    const parts = ids.map((id) => byUtterance.get(id));
    const good = parts.filter(
      (p) => p && (p.status === "ok" || p.status === "same-language"),
    );
    const failure = parts.find(
      (p) => p && p.status !== "ok" && p.status !== "same-language",
    );
    const status: STTOutputRendering["status"] =
      good.length === ids.length
        ? good.every((p) => p?.status === "same-language")
          ? "same-language"
          : "ok"
        : good.length > 0
          ? "partial"
          : (failure?.status ?? "error");
    out[tag] = {
      language: tag,
      text: parts
        .map((p) => p?.text ?? "")
        .filter(Boolean)
        .join(" "),
      status,
      ms: Math.max(0, ...parts.map((p) => p?.ms ?? 0)),
      segments: parts.map((p, index) => ({ index, text: p?.text ?? "" })),
      ...(status !== "ok" && status !== "same-language" && failure?.reason
        ? { reason: failure.reason }
        : {}),
    };
  }
  return out;
}

/** "outputs es ok · fr timeout" */
function describeOutputs(outputs: Record<string, STTOutputRendering>): string {
  return `outputs ${Object.values(outputs)
    .map((o) => `${o.language} ${o.status}`)
    .join(" · ")}`;
}

function sumTimings(
  corrections: Map<number, TranscribeStreamCorrectedEvent>,
  key: "decideMs" | "rewriteMs",
): number | undefined {
  const values = [...corrections.values()]
    .map((c) => c.timings[key])
    .filter((v): v is number => typeof v === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) : undefined;
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

  if (options.chunking === "utterances") {
    return transcribeUtterances(buffer, format, options, deps, startedAt);
  }

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

  // 3. Primary and second opinion, in parallel. "auto" names the fallback.
  const secondSetting = options.correction?.secondOpinion;
  const secondOpinionSpec =
    secondSetting === "auto"
      ? options.fallback
        ? { provider: options.fallback.provider, model: options.fallback.model }
        : undefined
      : secondSetting;
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

  // 3b. Language probe. With a fallback and no pinned language, an engine
  // that can answer "which language is this" without transcribing (its
  // `languageProbeModel`) is asked first, in a fraction of a full pass. When
  // it is unsure, the fallback transcribes instead of the primary, so an
  // English recording never pays for a full Indic pass that would come back
  // as noise; the primary still runs if the fallback has nothing.
  let probed: "confident" | "unsure" | undefined;
  const pinnedLanguage =
    typeof engineBase.language === "string" &&
    engineBase.language.trim() !== "" &&
    engineBase.language.trim().toLowerCase() !== "auto";
  // The verdict only matters when an unsure primary hands over.
  const probeModel =
    fallbackProvider &&
    fallbackWhen.has("unsure") &&
    options.routing?.probe !== false &&
    !pinnedLanguage
      ? deps.getHandler(provider)?.languageProbeModel?.()
      : undefined;
  if (probeModel && fallbackProvider !== provider) {
    const probeStarted = Date.now();
    try {
      const verdict = await deps.transcribe(
        wavHead(buffer, PROBE_SECONDS),
        provider,
        optionsFor(probeModel),
      );
      const detected = readLanguageDetected(verdict);
      probed = detected === false ? "unsure" : "confident";
      steps.push(
        `language probe ${probed}${verdict.language ? ` (${verdict.language})` : ""} · ${Date.now() - probeStarted} ms`,
      );
    } catch (error) {
      steps.push("language probe failed · transcribing with the primary");
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribe] language probe failed: ${errorMessage(error)}`,
        );
      }
    }
  }

  let primary: STTResult | undefined;
  let primaryError: unknown;
  let probedFallback: STTResult | undefined;
  if (probed === "unsure" && fallbackProvider && fallbackWhen.has("unsure")) {
    try {
      probedFallback = await deps.transcribe(
        buffer,
        fallbackProvider,
        optionsFor(fallback?.model),
      );
    } catch (error) {
      steps.push(`fallback ${fallbackProvider} failed · trying the primary`);
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribe] probed fallback ${fallbackProvider} failed: ${errorMessage(error)}`,
        );
      }
    }
  }
  if (!probedFallback?.text.trim()) {
    try {
      primary = await deps.transcribe(
        buffer,
        provider,
        optionsFor(primaryModel),
      );
    } catch (error) {
      primaryError = error;
    }
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

  if (probedFallback?.text.trim() && fallbackProvider) {
    chosen = probedFallback;
    chosenProvider = fallbackProvider;
    chosenModel = fallback?.model;
    fallbackUsed = true;
    steps.push(`fallback ${fallbackProvider} (probe said unsure)`);
  } else if (fallback && fallbackProvider && fallbackReason) {
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

  // 4b. Language routing: a transcript whose language belongs to another
  // engine is read again by that engine, and kept when it reads the language.
  const routes = options.routing?.engines;
  const chosenLanguage = chosen
    ? normalizeLanguageCode(chosen.language)
    : undefined;
  if (chosen && routes && chosenLanguage && !pinnedLanguage) {
    const routeName =
      Object.entries(routes).find(
        ([lang]) => normalizeLanguageCode(lang) === chosenLanguage,
      )?.[1] ?? routes["*"];
    let target: string | undefined;
    try {
      target = routeName ? deps.resolveProvider(routeName) : undefined;
    } catch {
      steps.push(`routing ${chosenLanguage} → ${routeName} unavailable`);
    }
    if (target && target !== chosenProvider) {
      try {
        const routed = await deps.transcribe(buffer, target, {
          ...optionsFor(
            target === fallbackProvider ? fallback?.model : undefined,
          ),
          languagePrior: chosenLanguage,
        });
        if (routed.text.trim() && readLanguageDetected(routed) !== false) {
          chosen = {
            ...routed,
            language: routed.language ?? chosen.language,
          };
          chosenProvider = target;
          chosenModel =
            target === fallbackProvider ? fallback?.model : undefined;
          steps.push(`routed ${chosenLanguage} → ${target}`);
        } else {
          steps.push(
            `routing ${chosenLanguage} → ${target} heard nothing · kept ${chosenProvider}`,
          );
        }
      } catch {
        steps.push(
          `routing ${chosenLanguage} → ${target} failed · kept ${chosenProvider}`,
        );
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

  // 5b. Guards on the engine output: a decoding loop is collapsed and a
  // prompt echo is emptied before the correction layer sees the text.
  chosen = guardEngineResult(chosen, promptTermsOf(options), (note) =>
    steps.push(note),
  );

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
        chosen.language,
      );
      decisions = corrected.decisions;
      steps.push(...corrected.steps);
      Object.assign(correctionTimings, corrected.timings);
      correctedSegments = chosen.segments.map((seg, i) => {
        const text = corrected.lines[i]?.trim() || seg.text;
        if (text === seg.text || !seg.words?.length) {
          return { ...seg, text };
        }
        const words = alignWordsToText(seg.words, text);
        return words.length
          ? { ...seg, text, words }
          : { ...seg, text, words: undefined };
      });
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
      const correctFn =
        options.correction?.perSentence === false
          ? correctTranscript
          : correctTranscriptSentences;
      const corrected = await correctFn(
        {
          text: engineText,
          ...(secondText ? { secondOpinion: secondText } : {}),
          ...(options.dictionary ? { dictionary: options.dictionary } : {}),
          ...(options.correction ? { options: options.correction } : {}),
          ...(languageDetected !== undefined ? { languageDetected } : {}),
          ...(chosen.language && languageDetected !== false
            ? { language: chosen.language }
            : {}),
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

  // 7. Output languages, from the settled text: per segment when the
  // transcript has several (so renderings keep the timings), else whole.
  let outputs: Record<string, STTOutputRendering> | undefined;
  let outputMs: number | undefined;
  const outputLanguages = outputLanguagesOf(options.output);
  if (outputLanguages.length > 0) {
    const outputStarted = Date.now();
    const segs = chosen.segments ?? [];
    let source: string[];
    let corrected: string[] | undefined;
    if (correctedSegments && segs.length === correctedSegments.length) {
      source = segs.map((seg) => seg.text);
      corrected = correctedSegments.map((seg) => seg.text);
    } else if (segs.length > 1 && finalText === raw) {
      source = segs.map((seg) => seg.text);
    } else {
      source = [raw];
      corrected = finalText !== raw ? [finalText] : undefined;
    }
    outputs = await renderOutputs(
      {
        source,
        ...(corrected ? { corrected } : {}),
        ...(chosen.language && languageDetected !== false
          ? { language: chosen.language }
          : {}),
        languages: outputLanguages,
        ...(options.dictionary ? { dictionary: options.dictionary } : {}),
        options: options.output,
      },
      deps,
    );
    outputMs = Date.now() - outputStarted;
    steps.push(describeOutputs(outputs));
  }

  // Word timings follow the corrected text.
  const words =
    finalText !== raw && chosen.words?.length && !correctedSegments
      ? alignWordsToText(chosen.words, finalText)
      : chosen.words;

  // 8. Result.
  const { text: _engineText, words: _engineWords, ...chosenRest } = chosen;
  const result: TranscribeResult = {
    ...chosenRest,
    ...(correctedSegments ? { segments: correctedSegments } : {}),
    ...(words?.length ? { words } : {}),
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
      ...(outputMs !== undefined ? { outputMs } : {}),
      totalMs: Date.now() - startedAt,
    },
    steps,
    ...(outputs ? { outputs } : {}),
  };

  if (logger.shouldLog("debug")) {
    logger.debug(
      `[transcribe] ${chosenProvider}: ${raw.length} chars raw, ${finalText.length} final in ${result.timings.totalMs}ms`,
      { steps },
    );
  }
  return result;
}
