/** 60db workspace text-to-speech over its HTTP API. */
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import { createWavFile } from "../audio-utils.js";

const RATE = 24_000;
const DEFAULT_BASE_URL = "https://api.60db.ai";
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid 60db response record");
  }
  return value as Record<string, unknown>;
}

function validateRecord(value: Record<string, unknown>): void {
  if (value.success === false || value.error || value.type === "error") {
    throw new Error("60db returned a synthesis error");
  }
  if (value.sample_rate !== undefined && value.sample_rate !== RATE) {
    throw new Error("60db returned an unexpected sample rate");
  }
  for (const encoding of [value.encoding, value.output_format]) {
    if (
      encoding !== undefined &&
      !["LINEAR16", "PCM", "WAV"].includes(String(encoding).toUpperCase())
    ) {
      throw new Error("60db returned compressed audio for a LINEAR16 request");
    }
  }
}

/** Remove a PCM WAV container, including optional RIFF chunks. */
function pcmFromWav(bytes: Buffer): Buffer {
  if (
    bytes.length < 12 ||
    bytes.toString("ascii", 8, 12) !== "WAVE" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  ) {
    throw new Error("Invalid 60db WAV container");
  }
  let validFormat = false;
  let audio: Buffer | undefined;
  let offset = 12;
  for (; offset + 8 <= bytes.length; ) {
    const name = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) {
      throw new Error("Truncated 60db WAV chunk");
    }
    if (name === "fmt ") {
      validFormat =
        size >= 16 &&
        bytes.readUInt16LE(start) === 1 &&
        bytes.readUInt16LE(start + 2) === 1 &&
        bytes.readUInt32LE(start + 4) === RATE &&
        bytes.readUInt32LE(start + 8) === RATE * 2 &&
        bytes.readUInt16LE(start + 12) === 2 &&
        bytes.readUInt16LE(start + 14) === 16;
    }
    if (name === "data") {
      if (audio) {
        throw new Error("Multiple 60db WAV data chunks");
      }
      audio = bytes.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (
    offset !== bytes.length ||
    !validFormat ||
    !audio?.length ||
    audio.length % 2
  ) {
    throw new Error("Expected nonempty mono PCM16 WAV at 24 kHz");
  }
  return audio;
}

function audioFromRecord(value: unknown, depth = 0): Buffer | undefined {
  const envelope = record(value);
  validateRecord(envelope);
  const backend =
    envelope.backendResponse === undefined
      ? envelope
      : record(envelope.backendResponse);
  validateRecord(backend);
  const result =
    backend.result === undefined ? backend : record(backend.result);
  validateRecord(result);
  const encoded = backend.audio_base64 ?? result.audioContent;
  if (encoded === undefined) {
    return undefined;
  }
  if (
    typeof encoded !== "string" ||
    !encoded.length ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      encoded,
    )
  ) {
    throw new Error("Invalid 60db audio encoding");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes[0] === 123 && bytes[1] === 34) {
    if (depth >= 1) {
      throw new Error("Excessive nested 60db audio encoding");
    }
    return audioFromRecord(JSON.parse(bytes.toString("utf8")), depth + 1);
  }
  const signature = bytes.toString("ascii", 0, 4);
  if (signature === "RIFF") {
    return pcmFromWav(bytes);
  }
  if (signature === "OggS" || signature.startsWith("ID3")) {
    throw new Error("Expected 60db PCM audio");
  }
  if (!bytes.length || bytes.length % 2) {
    throw new Error("Incomplete 60db PCM audio");
  }
  return bytes;
}

/** Buffered synthesis; NeuroLink's processor handles sentence streaming. */
export class SixtyDBTTS implements TTSHandler {
  public readonly maxTextLength = 5000;
  private readonly apiKey: string | null;
  private voices?: { fetchedAt: number; values: TTSVoice[] };

  private readonly baseUrl: string;

  /**
   * Explicit endpoint supports deployments using their own API proxy; the
   * `SIXTYDB_BASE_URL` environment variable sets the same thing for the
   * auto-registered handler (and so for the CLI), the way
   * `ELEVENLABS_BASE_URL` does for ElevenLabs. An explicit argument wins;
   * with neither, the endpoint is `https://api.60db.ai`.
   * HTTP is accepted only for a loopback host (offline tests dial
   * http://127.0.0.1:<port>); every other override must be HTTPS, since
   * requests carry `Authorization: Bearer <key>` (CodeRabbit finding on
   * the PR this was taken over from, applied here). The loopback list
   * matches proxyReplay.ts's own HTTPS-except-loopback check, including
   * "localhost" for a deployer's local proxy, not just the IP forms.
   */
  constructor(apiKey?: string, baseUrl?: string) {
    const url =
      baseUrl ?? (process.env.SIXTYDB_BASE_URL?.trim() || DEFAULT_BASE_URL);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new TTSError({
        code: TTS_ERROR_CODES.INVALID_INPUT,
        message: `SixtyDBTTS endpoint is not a valid URL: ${url}`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    const loopback = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(
      parsed.hostname,
    );
    if (
      parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && loopback)
    ) {
      throw new TTSError({
        code: TTS_ERROR_CODES.INVALID_INPUT,
        message: `SixtyDBTTS endpoint must use HTTPS unless it targets loopback, got: ${parsed.protocol}//${parsed.host}`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    this.baseUrl = url;
    this.apiKey = (apiKey ?? process.env.SIXTYDB_API_KEY ?? "").trim() || null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "SIXTYDB_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    return this.apiKey;
  }

  /** The non-retriable error a caller-cancelled request surfaces as. */
  private static cancelledError(signal: AbortSignal): TTSError {
    const reason: unknown = signal.reason;
    return new TTSError({
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: "60db request cancelled by the caller's signal",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.LOW,
      retriable: false,
      originalError: reason instanceof Error ? reason : undefined,
    });
  }

  /**
   * One request, bounded by a 30 s timer that covers the response headers
   * AND the body. The caller's `signal` (`TTSOptions.signal`, which
   * `generate()` derives from its own synthesis budget and `abortSignal`)
   * aborts the same controller, so a cancelled caller no longer leaves the
   * request running to the 30 s timer; an abort it caused is reported as a
   * cancellation, not a timeout.
   */
  private async request(
    path: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<string> {
    const key = this.requireKey();
    if (signal?.aborted) {
      throw SixtyDBTTS.cancelledError(signal);
    }
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timedOut = false;
    const abort = (): void => {
      controller.abort();
      void reader?.cancel().catch(() => undefined);
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      abort();
    }, 30_000);
    signal?.addEventListener("abort", abort, { once: true });
    let status: number | undefined;
    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}${path}`,
        {
          method: body ? "POST" : "GET",
          redirect: "error",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        },
      );
      status = response.status;
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        const retriable = status === 408 || status === 429 || status >= 500;
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `60db request failed (HTTP ${status})`,
          category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable,
          context: { status },
        });
      }
      if (!response.body) {
        throw new Error("60db returned no response body");
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let size = 0;
      let text = "";
      let complete = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          size += value.length;
          if (size > MAX_RESPONSE_BYTES) {
            throw new Error("60db response exceeds 64 MiB");
          }
          text += decoder.decode(value, { stream: true });
        }
        if (controller.signal.aborted) {
          throw new Error("60db response aborted");
        }
        text += decoder.decode();
        complete = true;
        return text;
      } finally {
        if (!complete) {
          await reader.cancel().catch(() => undefined);
        }
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof TTSError) {
        throw error;
      }
      if (signal?.aborted && !timedOut) {
        throw SixtyDBTTS.cancelledError(signal);
      }
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: timedOut
          ? "60db request timed out after 30s"
          : "60db request failed",
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: status === undefined,
        context: { status },
        originalError: error instanceof Error ? error : undefined,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    this.requireKey();
    const voice = options.voice ?? process.env.SIXTYDB_DEFAULT_VOICE;
    const speed = options.speed ?? 1;
    const format = options.format ?? "wav";
    if (
      !text.trim() ||
      text.length > this.maxTextLength ||
      !voice ||
      !UUID.test(voice) ||
      !Number.isFinite(speed) ||
      speed < 0.5 ||
      speed > 2 ||
      !["wav", "pcm16"].includes(format)
    ) {
      throw new TTSError({
        code: TTS_ERROR_CODES.INVALID_INPUT,
        message:
          "60db requires 1–5000 text characters, a workspace voice UUID, speed 0.5–2, and wav or pcm16 format",
        category: ErrorCategory.VALIDATION,
        retriable: false,
      });
    }
    const start = Date.now();
    const response = await this.request(
      "/tts-synthesize",
      {
        text,
        voice_id: voice,
        audio_config: { audio_encoding: "LINEAR16", sample_rate_hertz: RATE },
        speed,
        timestamp_type: "NONE",
      },
      options.signal,
    );
    let pcm: Buffer;
    try {
      // JSON can be pretty-printed; NDJSON records are parsed individually.
      let records: unknown[];
      try {
        records = [JSON.parse(response)];
      } catch {
        records = response
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));
      }
      const chunks = records
        .map((value) => audioFromRecord(value))
        .filter((value): value is Buffer => value !== undefined);
      pcm = Buffer.concat(chunks);
      if (!pcm.length) {
        throw new Error("60db returned no audio");
      }
    } catch (error) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: "Invalid 60db synthesis response",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        originalError: error instanceof Error ? error : undefined,
      });
    }
    const buffer = format === "wav" ? createWavFile(pcm, RATE) : pcm;
    logger.info(
      `[SixtyDBTTS] Synthesized ${buffer.length} bytes in ${Date.now() - start}ms`,
    );
    return {
      buffer,
      format,
      size: buffer.length,
      voice,
      sampleRate: RATE,
      duration: pcm.length / (RATE * 2),
      metadata: { latency: Date.now() - start, provider: "sixtydb" },
    };
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    this.requireKey();
    if (!this.voices || Date.now() - this.voices.fetchedAt >= 300_000) {
      const voices = new Map<string, TTSVoice>();
      for (const tier of ["quality", "fast"]) {
        try {
          const response = record(
            JSON.parse(await this.request(`/voices?model=${tier}`)),
          );
          if (response.success !== true || !Array.isArray(response.data)) {
            throw new Error("Invalid voice catalog");
          }
          for (const value of response.data) {
            const voice = record(value);
            if (
              typeof voice.voice_id !== "string" ||
              !UUID.test(voice.voice_id) ||
              typeof voice.name !== "string"
            ) {
              throw new Error("Invalid voice record");
            }
            const labels =
              voice.labels === undefined ? {} : record(voice.labels);
            const language =
              typeof labels.language === "string" ? labels.language : "";
            voices.set(voice.voice_id, {
              id: voice.voice_id,
              name: voice.name,
              languageCode: language,
              languageCodes: language ? [language] : [],
              gender:
                labels.gender === "male" || labels.gender === "female"
                  ? labels.gender
                  : "neutral",
              description:
                typeof voice.description === "string"
                  ? voice.description
                  : undefined,
            });
          }
        } catch (error) {
          if (error instanceof TTSError) {
            throw error;
          }
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "Invalid 60db voice catalog",
            category: ErrorCategory.EXECUTION,
            retriable: false,
          });
        }
      }
      this.voices = { fetchedAt: Date.now(), values: [...voices.values()] };
    }
    if (!languageCode) {
      return this.voices.values;
    }
    // 60db's catalog stores bare codes ("en", "hi"); a caller may pass a
    // regional one ("en-US"), matching this handler's own documented
    // example (TTSProcessor.getVoices JSDoc). Match on the primary subtag
    // unconditionally (not just when one side lacks a region), so "en"
    // and "en-US" match both ways; this also matches "en-US" against a
    // catalog entry of "en-GB", which 60db's bare-code catalog never
    // presents in practice (AzureTTS does the narrower startsWith match,
    // in the other direction, since its catalog does carry regions).
    // Both separators count, so a POSIX-style "en_US" reduces to "en" the
    // same way "en-US" does (ElevenLabs TTS/STT split on /[-_]/ too).
    const primary = (code: string): string => code.split(/[-_]/, 1)[0] ?? code;
    const wanted = languageCode.trim().toLowerCase();
    const wantedPrimary = primary(wanted);
    return this.voices.values.filter((voice) => {
      const have = voice.languageCode.trim().toLowerCase();
      return have === wanted || primary(have) === wantedPrimary;
    });
  }
}
