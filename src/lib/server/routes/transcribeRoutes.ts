/**
 * Transcribe Routes
 *
 * - `POST <basePath>/agent/transcribe` — JSON in (`audio` base64, `audioUrl`
 *   or an allow-listed `audioPath`), `TranscribeResult` out, in the adapters'
 *   usual `{ data, metadata }` envelope.
 * - `POST /v1/audio/transcriptions` — OpenAI-compatible: `multipart/form-data`
 *   in, OpenAI's `json` / `verbose_json` / `text` out (no envelope), with
 *   NeuroLink's extras on `verbose_json`.
 *
 * Both call `neurolink.transcribe()`. Neither accepts credentials: engines use
 * the server's own configuration.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  RouteGroup,
  ServerContext,
  ServerOpenAITranscriptionResponse,
  ServerTranscribeRequest,
  ServerTranscribeRouteOptions,
  ServerTranscribeStreamConfig,
  TranscribeOptions,
  TranscribeResult,
  TTSAudioFormat,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";
import { MAX_AUDIO_BYTES } from "../../utils/sizeGuard.js";
import { RawBodyTooLargeError } from "../utils/rawBody.js";
import {
  createErrorResponse,
  TranscribeConfigSchema,
  TranscribeRequestSchema,
  validateRequest,
} from "../utils/validation.js";

const FORMAT_BY_MIME: Record<string, TTSAudioFormat> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/webm": "webm",
  "video/webm": "webm",
  "video/mp4": "mp4",
  "audio/l16": "pcm16",
};

/** OpenAI model names an OpenAI client sends by default; they mean "the server's default engine". */
const OPENAI_DEFAULT_MODELS = new Set([
  "",
  "auto",
  "default",
  "whisper-1",
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
]);

/** STT error codes that describe the request, not the server. */
const CLIENT_ERROR_CODES = new Set([
  "STT_AUDIO_EMPTY",
  "STT_AUDIO_TOO_LONG",
  "STT_INVALID_AUDIO_FORMAT",
  "STT_LANGUAGE_NOT_SUPPORTED",
  "STT_PROVIDER_NOT_CONFIGURED",
  "STT_PROVIDER_NOT_SUPPORTED",
  "STT_STREAMING_NOT_SUPPORTED",
]);

/** A request that cannot be served, with the HTTP status that says why. */
class TranscribeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "TranscribeRequestError";
  }
}

/** The container a file name, path or URL names by its extension. */
async function formatFromName(
  name: string | undefined,
): Promise<TTSAudioFormat | undefined> {
  if (!name) {
    return undefined;
  }
  // Loaded on use, as NeuroLink itself loads it, to keep the voice stack off
  // the server's static import graph.
  const { audioFormatFromName } = await import("../../voice/transcribe.js");
  try {
    return audioFormatFromName(new URL(name).pathname);
  } catch {
    return audioFormatFromName(name); // Not a URL — a file name or path.
  }
}

function formatFromMime(mime: string | undefined): TTSAudioFormat | undefined {
  if (!mime) {
    return undefined;
  }
  return FORMAT_BY_MIME[mime.split(";")[0].trim().toLowerCase()];
}

function tooLarge(limit: number): TranscribeRequestError {
  return new TranscribeRequestError(
    `Audio exceeds the ${limit}-byte limit`,
    413,
    "PAYLOAD_TOO_LARGE",
  );
}

/** Base64 or a `data:` URL → bytes, refusing more than `limit` before decoding. */
function decodeBase64Audio(
  value: string,
  limit: number,
): { audio: Buffer; format?: TTSAudioFormat } {
  let payload = value.trim();
  let format: TTSAudioFormat | undefined;
  const dataUrl = payload.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,/i);
  if (dataUrl) {
    format = formatFromMime(dataUrl[1]);
    payload = payload.slice(dataUrl[0].length);
  }
  if (Math.floor((payload.length * 3) / 4) > limit + 3) {
    throw tooLarge(limit);
  }
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(payload.replace(/\s+/g, ""))) {
    throw new TranscribeRequestError(
      "audio is not valid base64",
      400,
      "VALIDATION_ERROR",
    );
  }
  const audio = Buffer.from(payload, "base64");
  if (audio.length === 0) {
    throw new TranscribeRequestError("audio is empty", 400, "VALIDATION_ERROR");
  }
  if (audio.length > limit) {
    throw tooLarge(limit);
  }
  return { audio, format };
}

/** A path inside one of the allowed roots, after resolving symlinks; refused otherwise. */
async function readAllowedPath(
  requested: string,
  roots: string[] | undefined,
  limit: number,
): Promise<Buffer> {
  if (!roots || roots.length === 0) {
    throw new TranscribeRequestError(
      "audioPath is disabled on this server; send audio (base64) or audioUrl instead",
      403,
      "FORBIDDEN",
    );
  }
  let real: string;
  try {
    real = await fs.promises.realpath(path.resolve(requested));
  } catch {
    throw new TranscribeRequestError(
      "audioPath does not exist",
      404,
      "NOT_FOUND",
    );
  }
  const allowed = await Promise.all(
    roots.map(async (root) => {
      try {
        const realRoot = await fs.promises.realpath(path.resolve(root));
        return real === realRoot || real.startsWith(realRoot + path.sep);
      } catch {
        return false;
      }
    }),
  );
  if (!allowed.some(Boolean)) {
    throw new TranscribeRequestError(
      "audioPath is outside the directories this server allows",
      403,
      "FORBIDDEN",
    );
  }
  const stat = await fs.promises.stat(real);
  if (!stat.isFile()) {
    throw new TranscribeRequestError(
      "audioPath is not a file",
      400,
      "VALIDATION_ERROR",
    );
  }
  if (stat.size > limit) {
    throw tooLarge(limit);
  }
  return fs.promises.readFile(real);
}

async function resolveAudio(
  request: ServerTranscribeRequest,
  options: ServerTranscribeRouteOptions,
  limit: number,
): Promise<{ audio: Buffer; format?: TTSAudioFormat }> {
  if (request.audio !== undefined) {
    const decoded = decodeBase64Audio(request.audio, limit);
    return { audio: decoded.audio, format: request.format ?? decoded.format };
  }
  if (request.audioUrl !== undefined) {
    if (!/^https?:\/\//i.test(request.audioUrl)) {
      throw new TranscribeRequestError(
        "audioUrl must be an http(s) URL",
        400,
        "VALIDATION_ERROR",
      );
    }
    const { safeDownload } = await import("../../utils/safeFetch.js");
    let audio: Buffer;
    try {
      audio = await safeDownload(request.audioUrl, {
        maxBytes: limit,
        label: "transcription audio",
      });
    } catch (error) {
      throw new TranscribeRequestError(
        `could not download audioUrl: ${error instanceof Error ? error.message : String(error)}`,
        400,
        "VALIDATION_ERROR",
      );
    }
    return {
      audio,
      format: request.format ?? (await formatFromName(request.audioUrl)),
    };
  }
  if (request.audioPath !== undefined) {
    const audio = await readAllowedPath(
      request.audioPath,
      options.allowedAudioRoots,
      limit,
    );
    return {
      audio,
      format: request.format ?? (await formatFromName(request.audioPath)),
    };
  }
  throw new TranscribeRequestError(
    "Pass exactly one of audio, audioUrl or audioPath",
    400,
    "VALIDATION_ERROR",
  );
}

/** Validated config → SDK options (no credentials, ever). */
function toTranscribeOptions(
  config: ServerTranscribeStreamConfig,
  audio: Buffer,
  format: TTSAudioFormat | undefined,
  maxAudioBytes: number,
): TranscribeOptions {
  return {
    audio,
    // The route already accepted this many bytes; without passing it on the
    // SDK would re-check against its own 25 MB default and refuse the file.
    maxAudioBytes,
    ...(format ? { format } : {}),
    ...(config.provider ? { provider: config.provider } : {}),
    ...(config.model ? { model: config.model } : {}),
    ...(config.language ? { language: config.language } : {}),
    ...(config.prompt ? { prompt: config.prompt } : {}),
    ...(config.dictionary ? { dictionary: config.dictionary } : {}),
    ...(config.correction ? { correction: config.correction } : {}),
    ...(config.fallback ? { fallback: config.fallback } : {}),
    ...(config.diarization !== undefined
      ? { diarization: config.diarization }
      : {}),
    ...(config.wordTimestamps !== undefined
      ? { wordTimestamps: config.wordTimestamps }
      : {}),
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
  };
}

/** Status and code for an error thrown by `transcribe()` or by this file. */
function classifyError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof TranscribeRequestError) {
    return { status: error.status, code: error.code, message };
  }
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  if (code && CLIENT_ERROR_CODES.has(code)) {
    return { status: 400, code: "VALIDATION_ERROR", message };
  }
  return { status: 500, code: "EXECUTION_FAILED", message };
}

async function runTranscription(
  ctx: ServerContext,
  route: string,
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  return withSpan(
    {
      name: "neurolink.http.transcribe",
      tracer: tracers.http,
      attributes: {
        "http.route": route,
        "stt.provider": options.provider ?? "default",
        "stt.model": options.model ?? "default",
        "stt.audio_bytes": Buffer.isBuffer(options.audio)
          ? options.audio.length
          : undefined,
      },
    },
    () => ctx.neurolink.transcribe(options),
  );
}

// ---------------------------------------------------------------------------
// OpenAI-compatible route
// ---------------------------------------------------------------------------

function openAIError(
  status: number,
  message: string,
  param: string | null = null,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type: status >= 500 ? "server_error" : "invalid_request_error",
        param,
        code: null,
      },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function isTruthyField(value: FormDataEntryValue | null): boolean {
  return (
    typeof value === "string" &&
    ["true", "1", "yes", "on"].includes(value.trim().toLowerCase())
  );
}

function textField(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * OpenAI's `model` field names the engine here: `"<provider>"` or
 * `"<provider>/<model>"`. OpenAI's own model names (and `auto`) mean the
 * server's default engine, so an unmodified OpenAI client works.
 */
function engineFromModel(model: string | undefined): {
  provider?: string;
  model?: string;
} {
  const value = (model ?? "").trim();
  if (OPENAI_DEFAULT_MODELS.has(value.toLowerCase())) {
    return {};
  }
  const slash = value.indexOf("/");
  if (slash > 0) {
    return { provider: value.slice(0, slash), model: value.slice(slash + 1) };
  }
  return { provider: value };
}

function seconds(...values: Array<number | undefined>): number | undefined {
  return values.find((v) => typeof v === "number" && Number.isFinite(v));
}

function toVerboseJson(
  result: TranscribeResult,
): ServerOpenAITranscriptionResponse {
  const segments = (result.segments ?? []).map((segment, id) => ({
    id,
    start: seconds(segment.start, segment.startTime) ?? 0,
    end: seconds(segment.end, segment.endTime) ?? 0,
    text: segment.text,
    ...(segment.speaker ? { speaker: segment.speaker } : {}),
  }));
  const words = (result.words ?? []).flatMap((word) => {
    const start = seconds(word.start, word.startTime);
    if (start === undefined) {
      return [];
    }
    return [
      {
        word: word.word,
        start,
        end: seconds(word.end, word.endTime) ?? start,
        ...(word.speaker ? { speaker: word.speaker } : {}),
      },
    ];
  });
  return {
    task: "transcribe",
    text: result.text,
    ...(result.language ? { language: result.language } : {}),
    ...(result.duration !== undefined ? { duration: result.duration } : {}),
    ...(segments.length > 0 ? { segments } : {}),
    ...(words.length > 0 ? { words } : {}),
    raw: result.raw,
    ...(result.corrected !== undefined ? { corrected: result.corrected } : {}),
    ...(result.decisions ? { decisions: result.decisions } : {}),
    engine: result.engine,
    ...(result.languageDetected !== undefined
      ? { language_detected: result.languageDetected }
      : {}),
    steps: result.steps,
    timings: result.timings,
  };
}

async function handleOpenAITranscription(
  ctx: ServerContext,
  options: ServerTranscribeRouteOptions,
  limit: number,
  route: string,
): Promise<Response> {
  const contentType = ctx.headers["content-type"] ?? "";
  if (!/^\s*multipart\/form-data/i.test(contentType)) {
    return openAIError(
      400,
      "Send multipart/form-data with a `file` field, as OpenAI's /v1/audio/transcriptions takes",
    );
  }
  if (ctx.body instanceof RawBodyTooLargeError) {
    return openAIError(413, ctx.body.message, "file");
  }
  if (!Buffer.isBuffer(ctx.body)) {
    return openAIError(400, "Empty or unreadable multipart body");
  }

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(ctx.body), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    return openAIError(400, "Malformed multipart/form-data body");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return openAIError(400, "Missing `file`", "file");
  }
  if (file.size === 0) {
    return openAIError(400, "`file` is empty", "file");
  }
  if (file.size > limit) {
    return openAIError(413, `Audio exceeds the ${limit}-byte limit`, "file");
  }

  const responseFormat = textField(form, "response_format") ?? "json";
  if (!["json", "verbose_json", "text"].includes(responseFormat)) {
    return openAIError(
      400,
      "response_format must be json, verbose_json or text",
      "response_format",
    );
  }

  let dictionary: unknown;
  const dictionaryField = textField(form, "dictionary");
  if (dictionaryField) {
    try {
      dictionary = JSON.parse(dictionaryField);
    } catch {
      return openAIError(400, "`dictionary` is not valid JSON", "dictionary");
    }
  }

  const engine = engineFromModel(textField(form, "model"));
  const granularities = form
    .getAll("timestamp_granularities[]")
    .concat(form.getAll("timestamp_granularities"));
  const secondOpinion = textField(form, "second_opinion");
  const correct = isTruthyField(form.get("correct"));
  const fallback = textField(form, "fallback");
  const language = textField(form, "language");
  const prompt = textField(form, "prompt");

  const candidate = {
    provider: textField(form, "provider") ?? engine.provider,
    model: engine.model,
    language,
    prompt,
    dictionary,
    ...(correct || secondOpinion
      ? {
          correction: {
            enabled: true,
            ...(secondOpinion
              ? { secondOpinion: { provider: secondOpinion } }
              : {}),
          },
        }
      : {}),
    ...(fallback ? { fallback: { provider: fallback } } : {}),
    ...(isTruthyField(form.get("diarize")) ? { diarization: true } : {}),
    ...(granularities.includes("word") ? { wordTimestamps: true } : {}),
  };
  const parsed = TranscribeConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return openAIError(
      400,
      `Invalid ${issue?.path.join(".") || "request"}: ${issue?.message ?? "invalid value"}`,
      issue?.path[0] !== undefined ? String(issue.path[0]) : null,
    );
  }

  const audio = Buffer.from(await file.arrayBuffer());
  const format = (await formatFromName(file.name)) ?? formatFromMime(file.type);

  let result: TranscribeResult;
  try {
    result = await runTranscription(
      ctx,
      route,
      toTranscribeOptions(parsed.data, audio, format, limit),
    );
  } catch (error) {
    const classified = classifyError(error);
    logger.warn("[transcribeRoutes] OpenAI-compatible transcription failed", {
      requestId: ctx.requestId,
      error: classified.message,
    });
    return openAIError(classified.status, classified.message);
  }

  if (responseFormat === "text") {
    return new Response(result.text, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const body =
    responseFormat === "verbose_json"
      ? toVerboseJson(result)
      : { text: result.text };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Route group
// ---------------------------------------------------------------------------

const TRANSCRIBE_REQUEST_JSON_SCHEMA = {
  type: "object",
  description:
    "Exactly one of audio (base64 or data: URL), audioUrl (http/https) or audioPath (server-allowed directories only).",
  properties: {
    audio: { type: "string", description: "Base64 audio or a data: URL" },
    audioUrl: { type: "string", format: "uri" },
    audioPath: { type: "string" },
    format: { type: "string" },
    provider: { type: "string" },
    model: { type: "string" },
    language: { type: "string", description: "Language code or auto" },
    prompt: { type: "string" },
    dictionary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          heardAs: { type: "array", items: { type: "string" } },
          meaning: { type: "string" },
        },
        required: ["term"],
      },
    },
    correction: { type: "object" },
    fallback: { type: "object" },
    diarization: { type: "boolean" },
    wordTimestamps: { type: "boolean" },
    timeoutMs: { type: "number" },
  },
};

/**
 * Create the transcription routes.
 *
 * @param basePath - Prefix of the NeuroLink route (default `/api`).
 * @param options - `allowedAudioRoots` (default: `audioPath` refused),
 *   `maxAudioBytes` (default 50 MB) and `openaiBasePath` (default `""`, so the
 *   OpenAI-compatible route is `/v1/audio/transcriptions`).
 */
export function createTranscribeRoutes(
  basePath: string = "/api",
  options: ServerTranscribeRouteOptions = {},
): RouteGroup {
  const limit = options.maxAudioBytes ?? MAX_AUDIO_BYTES;
  const nativePath = `${basePath}/agent/transcribe`;
  const openaiPath = `${options.openaiBasePath ?? ""}/v1/audio/transcriptions`;

  return {
    // Empty prefix: the two routes live under different roots, and every
    // route path already starts with "", so the adapters add nothing.
    prefix: "",
    routes: [
      {
        method: "POST",
        path: nativePath,
        handler: async (ctx: ServerContext) => {
          const validation = validateRequest(
            TranscribeRequestSchema,
            ctx.body,
            ctx.requestId,
          );
          if (!validation.success) {
            return validation.error;
          }
          const request: ServerTranscribeRequest = validation.data;
          try {
            const { audio, format } = await resolveAudio(
              request,
              options,
              limit,
            );
            return await runTranscription(
              ctx,
              nativePath,
              toTranscribeOptions(request, audio, format, limit),
            );
          } catch (error) {
            const classified = classifyError(error);
            return createErrorResponse(
              classified.code,
              classified.message,
              undefined,
              ctx.requestId,
              classified.status,
            );
          }
        },
        description:
          "Transcribe audio (base64, URL or allowed path) with the transcribe inference type",
        requestSchema: TRANSCRIBE_REQUEST_JSON_SCHEMA,
        tags: ["agent", "transcribe"],
      },
      {
        method: "POST",
        path: openaiPath,
        handler: (ctx: ServerContext) =>
          handleOpenAITranscription(ctx, options, limit, openaiPath),
        description:
          "OpenAI-compatible transcription (multipart/form-data: file, model, language, prompt, response_format; extensions: provider, diarize, dictionary, correct, fallback, second_opinion)",
        tags: ["transcribe", "openai-compatible"],
      },
    ],
  };
}
