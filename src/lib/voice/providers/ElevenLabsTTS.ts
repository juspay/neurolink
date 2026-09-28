/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Implementation of TTS using ElevenLabs API.
 *
 * @module voice/providers/ElevenLabsTTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSAudioFormat,
  ElevenLabsModel,
  ElevenLabsMp3Bitrate,
  ElevenLabsOpusBitrate,
  ElevenLabsOutputFormat,
  ElevenLabsTTSOptions,
  ElevenLabsVoiceSettings,
  ElevenLabsVoicesResponse,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { delay } from "../../utils/async/delay.js";
import { calculateBackoff } from "../../utils/async/retry.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

const DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
/** Largest delay `setTimeout` honours; above it the timer fires at once. */
const MAX_TIMEOUT_MS = 2_147_483_647;
const DEFAULT_RETRIES = 1;
const DEFAULT_MODEL: ElevenLabsModel = "eleven_multilingual_v2";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const DEFAULT_OPUS_BITRATE: ElevenLabsOpusBitrate = 64;
const DEFAULT_MP3_BITRATE: ElevenLabsMp3Bitrate = 128;
/** The kbps values ElevenLabs serves on `opus_48000_*` / `mp3_44100_*`. */
const OPUS_BITRATES: ReadonlySet<number> = new Set([32, 64, 96, 128, 192]);
const MP3_BITRATES: ReadonlySet<number> = new Set([32, 64, 96, 128, 192]);

/** ElevenLabs accepts `voice_settings.speed` in this range only. */
const SPEED_MIN = 0.7;
const SPEED_MAX = 1.2;

/** Backoff between retries when the response carries no `Retry-After`. */
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 5_000;
/** Upper bound honoured for a server-supplied `Retry-After`. */
const RETRY_AFTER_CAP_MS = 10_000;

/**
 * Models that reject the `language_code` request field. The API reference
 * names only `multilingual_v2`; on every other model an unsupported code is
 * ignored server-side, so the field is sent rather than dropped — the old
 * two-model allow-list dropped a pin that v3 and the v4 family honour.
 */
const LANGUAGE_CODE_REJECTING_MODELS: ReadonlySet<string> = new Set([
  "eleven_multilingual_v2",
]);

/**
 * Error codes a failed `fetch()` carries (directly or on `cause`) when the
 * failure was the transport, not the request: worth a resend. Anything else
 * a `fetch()` throws before a request is sent — an invalid header value, a
 * malformed URL — is a permanent configuration error and is not retried.
 */
const TRANSPORT_ERROR_CODES: ReadonlySet<string> = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/** The numeric sample-rate segment of an `output_format` (`opus_48000_64` → 48000). */
const SAMPLE_RATE_SEGMENT = /_(\d{4,5})(?:_|$)/;

/**
 * Thrown inside the retry loop for a non-2xx response so the loop can decide
 * on status alone whether another attempt is worth making.
 */
class ElevenLabsHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterMs: number | undefined,
  ) {
    super(message);
    this.name = "ElevenLabsHttpError";
  }
}

/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Supports high-quality multilingual TTS with voice cloning.
 *
 * @see https://elevenlabs.io/docs/api-reference
 */
export class ElevenLabsTTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  /** `ELEVENLABS_VOICE_ID`, else Rachel; a per-request `voice` still wins. */
  private readonly defaultVoiceId: string;
  /** `ELEVENLABS_MODEL`, else `eleven_multilingual_v2`; a per-request `model` still wins. */
  private readonly defaultModel: ElevenLabsModel;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Maximum text length (5000 characters)
   */
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string) {
    const resolvedKey = (apiKey ?? process.env.ELEVENLABS_API_KEY ?? "").trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
    this.baseUrl = ElevenLabsTTS.normalizeBaseUrl(
      process.env.ELEVENLABS_BASE_URL ?? DEFAULT_BASE_URL,
    );
    this.defaultVoiceId =
      ElevenLabsTTS.envValue("ELEVENLABS_VOICE_ID") ?? DEFAULT_VOICE_ID;
    this.defaultModel =
      (ElevenLabsTTS.envValue("ELEVENLABS_MODEL") as
        | ElevenLabsModel
        | undefined) ?? DEFAULT_MODEL;
  }

  /** A trimmed, non-empty environment value, else `undefined`. */
  private static envValue(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < ElevenLabsTTS.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const voicesController = new AbortController();
      const voicesTimeoutId = setTimeout(
        () => voicesController.abort(),
        DEFAULT_TIMEOUT_MS,
      );
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/voices`, {
          method: "GET",
          headers: {
            "xi-api-key": this.apiKey,
          },
          signal: voicesController.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: `ElevenLabs voices request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            retriable: true,
            originalError: fetchErr,
          });
        }
        throw fetchErr;
      } finally {
        clearTimeout(voicesTimeoutId);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as ElevenLabsVoicesResponse;

      let voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        languageCode: "en", // ElevenLabs supports multiple languages per voice
        languageCodes: [
          "en",
          "es",
          "fr",
          "de",
          "it",
          "pt",
          "pl",
          "hi",
          "ar",
          "zh",
          "ja",
          "ko",
        ],
        gender: this.mapGender(voice.labels?.gender),
        type: "neural",
        description: voice.labels?.description,
      }));

      // Filter by language if specified
      if (languageCode) {
        const requested = languageCode.toLowerCase();
        const requestedBase = requested.split("-")[0];
        voices = voices.filter((v) =>
          v.languageCodes?.some((code) => {
            const c = code.toLowerCase();
            return (
              c === requested ||
              c === requestedBase ||
              c.startsWith(requestedBase)
            );
          }),
        );
      }

      // Cache voices
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return voices;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(
        `[ElevenLabsTTSHandler] Failed to get voices: ${errorMessage}`,
      );
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Failed to get voices: ${errorMessage}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const elevenOptions = options as ElevenLabsTTSOptions;

    try {
      const voiceId = options.voice ?? this.defaultVoiceId;
      const model = elevenOptions.model ?? this.defaultModel;
      const outputFormat = this.mapFormat(
        options.format ?? "mp3",
        elevenOptions,
      );
      const baseUrl = elevenOptions.baseUrl
        ? ElevenLabsTTS.normalizeBaseUrl(elevenOptions.baseUrl)
        : this.baseUrl;
      const timeoutMs = ElevenLabsTTS.resolveTimeoutMs(elevenOptions.timeoutMs);
      const retries = ElevenLabsTTS.resolveRetries(elevenOptions.retries);

      const requestBody: {
        text: string;
        model_id: ElevenLabsModel;
        voice_settings: ElevenLabsVoiceSettings;
        language_code?: string;
      } = {
        text,
        model_id: model,
        voice_settings: this.buildVoiceSettings(elevenOptions),
      };

      const languageCode = elevenOptions.languageCode ?? options.language;
      if (languageCode) {
        if (LANGUAGE_CODE_REJECTING_MODELS.has(model)) {
          logger.warn(
            `[ElevenLabsTTSHandler] language_code "${languageCode}" dropped: model "${model}" does not accept it`,
          );
        } else {
          requestBody.language_code =
            ElevenLabsTTS.toIso639Primary(languageCode);
        }
      }

      const url = `${baseUrl}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`;
      const body = JSON.stringify(requestBody);
      const headers = {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      };

      const audioBuffer = await this.fetchWithRetry(
        url,
        { method: "POST", headers, body },
        timeoutMs,
        retries,
        options.signal,
      );

      const latency = Date.now() - startTime;

      const result: TTSResult = {
        buffer: audioBuffer,
        // Use the *effective* output format from outputFormat, not the
        // requested format — otherwise unsupported requests that fell back to
        // mp3_44100_128 would mislabel the buffer (Copilot review).
        format: this.effectiveFormat(outputFormat),
        size: audioBuffer.length,
        voice: voiceId,
        sampleRate: this.getSampleRate(outputFormat),
        metadata: {
          latency,
          provider: "elevenlabs-tts",
          model,
          requestedFormat: options.format,
          outputFormat,
        },
      };

      logger.info(
        `[ElevenLabsTTSHandler] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof TTSError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[ElevenLabsTTSHandler] Synthesis failed: ${errorMessage}`);
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Synthesis failed: ${errorMessage}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable:
          err instanceof ElevenLabsHttpError
            ? ElevenLabsTTS.isRetriableStatus(err.status)
            : ElevenLabsTTS.isRetriableFailure(err),
        context: { textLength: text.length },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Issue the synthesis request, retrying on 429 / 5xx / network failure /
   * per-attempt timeout up to `retries` more times. A `Retry-After` header
   * sets the pause before the next attempt (capped); otherwise exponential
   * backoff from 500 ms. Any other failure — 4xx, or a body that is not audio
   * — is thrown on the first attempt.
   *
   * Total wall-clock is bounded by `timeoutMs × (1 + retries)` plus the pauses
   * between attempts; `BaseProvider`'s outer synthesis timeout is raised to at
   * least that figure (see `resolveTTSHandlerBudgetMs`).
   *
   * `signal` is the caller's cancellation: once it fires, the attempt in
   * flight is aborted and no further attempt is made. Without it, a caller
   * that had already given up (its own timeout, an aborted request) left the
   * loop to pause and issue a second, billable request nobody consumed.
   */
  private async fetchWithRetry(
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
    timeoutMs: number,
    retries: number,
    signal: AbortSignal | undefined,
  ): Promise<Buffer> {
    const totalAttempts = 1 + retries;
    let lastError: unknown;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      if (signal?.aborted) {
        throw ElevenLabsTTS.cancelledError(signal);
      }
      try {
        return await this.fetchOnce(url, init, timeoutMs, signal);
      } catch (err: unknown) {
        lastError = err;
        const retriable =
          !signal?.aborted && ElevenLabsTTS.isRetriableFailure(err);
        if (!retriable || attempt >= totalAttempts) {
          throw err;
        }
        const retryAfterMs =
          err instanceof ElevenLabsHttpError ? err.retryAfterMs : undefined;
        const pauseMs =
          retryAfterMs !== undefined
            ? Math.min(retryAfterMs, RETRY_AFTER_CAP_MS)
            : calculateBackoff(
                attempt,
                RETRY_BASE_DELAY_MS,
                RETRY_MAX_DELAY_MS,
              );
        logger.warn(
          `[ElevenLabsTTSHandler] attempt ${attempt}/${totalAttempts} failed (${
            err instanceof Error ? err.message : String(err)
          }); retrying in ${Math.round(pauseMs)}ms`,
        );
        await ElevenLabsTTS.pause(pauseMs, signal);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("ElevenLabs synthesis failed");
  }

  /**
   * A backoff pause that ends as soon as `signal` fires, so a cancelled
   * caller never waits it out. The timer is owned here and cleared on the
   * way out: racing a bare `delay()` against the signal settled the promise
   * at the abort but left the backoff timer armed for up to `RETRY_AFTER_CAP_MS`,
   * holding the event loop open after the caller had already been answered.
   */
  private static pause(
    ms: number,
    signal: AbortSignal | undefined,
  ): Promise<void> {
    if (!signal) {
      return delay(ms);
    }
    if (signal.aborted) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = (): void => {
        clearTimeout(timer);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  /** The non-retriable error a caller-cancelled synthesis surfaces as. */
  private static cancelledError(signal: AbortSignal): TTSError {
    const reason = signal.reason;
    return new TTSError({
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: "ElevenLabs TTS synthesis cancelled by the caller's signal",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.LOW,
      retriable: false,
      originalError: reason instanceof Error ? reason : undefined,
    });
  }

  /**
   * One attempt, end to end: the per-attempt timer covers the response
   * headers AND the audio body, so a stalled or truncated body is a timed-out
   * attempt the retry loop can resend rather than a hang that only the outer
   * provider budget ends. The caller's `signal` aborts the same controller,
   * and an abort it caused is reported as a cancellation, not a timeout.
   */
  private async fetchOnce(
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
    timeoutMs: number,
    signal: AbortSignal | undefined,
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onCallerAbort = (): void => controller.abort();
    signal?.addEventListener("abort", onCallerAbort, { once: true });
    const asAttemptError = (err: unknown): unknown =>
      signal?.aborted
        ? ElevenLabsTTS.cancelledError(signal)
        : ElevenLabsTTS.asAttemptError(err, timeoutMs);
    try {
      let response: Response;
      try {
        response = await fetch(url, { ...init, signal: controller.signal });
      } catch (fetchErr: unknown) {
        throw asAttemptError(fetchErr);
      }

      if (!response.ok) {
        // A body that PARSES to `null` (not one that fails to parse) isn't
        // caught by `.catch()`, and `.detail` on `null` throws — a 429/503
        // with a `null` body then failed on the first attempt with a
        // confusing TypeError instead of being retried.
        const errorData =
          (await response.json().catch(() => null)) ??
          (Object.create(null) as Record<string, unknown>);
        const errorMessage =
          (errorData as { detail?: { message?: string } }).detail?.message ||
          `HTTP ${response.status}`;
        throw new ElevenLabsHttpError(
          errorMessage,
          response.status,
          ElevenLabsTTS.parseRetryAfter(response.headers.get("retry-after")),
        );
      }

      try {
        return Buffer.from(await response.arrayBuffer());
      } catch (bodyErr: unknown) {
        // A body that stalls (abort) or breaks mid-stream is an attempt-level
        // failure: retriable, like a dropped connection.
        const attemptError = asAttemptError(bodyErr);
        if (attemptError === bodyErr) {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: `ElevenLabs TTS audio body failed: ${
              bodyErr instanceof Error ? bodyErr.message : String(bodyErr)
            }`,
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            originalError: bodyErr instanceof Error ? bodyErr : undefined,
          });
        }
        throw attemptError;
      }
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  /** Map an abort from the per-attempt timer to a retriable timeout error. */
  private static asAttemptError(err: unknown, timeoutMs: number): unknown {
    if (err instanceof Error && err.name === "AbortError") {
      return new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `ElevenLabs TTS request timed out after ${timeoutMs}ms`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err,
      });
    }
    return err;
  }

  private static isRetriableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  /**
   * 429 / 5xx, a per-attempt timeout or broken body (already a retriable
   * `TTSError`), or a transport failure. Any other throw — a `TypeError` for
   * an invalid header value or URL, thrown before a request exists — is
   * permanent and is not retried; it used to be, on the grounds that it was
   * an `Error`.
   */
  private static isRetriableFailure(err: unknown): boolean {
    if (err instanceof ElevenLabsHttpError) {
      return ElevenLabsTTS.isRetriableStatus(err.status);
    }
    if (err instanceof TTSError) {
      return err.retriable === true;
    }
    return ElevenLabsTTS.isTransportError(err);
  }

  /**
   * A socket-level failure: undici wraps one as `TypeError("fetch failed")`
   * with the system error on `cause`, and the codes are checked on both.
   */
  private static isTransportError(err: unknown): boolean {
    if (!(err instanceof Error)) {
      return false;
    }
    const code =
      ElevenLabsTTS.errorCode(err) ?? ElevenLabsTTS.errorCode(err.cause);
    if (code !== undefined && TRANSPORT_ERROR_CODES.has(code)) {
      return true;
    }
    return err instanceof TypeError && /\bfetch failed\b/i.test(err.message);
  }

  private static errorCode(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    const code = (value as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }

  /** A BCP-47 tag reduced to its ISO 639-1 primary subtag: `en-US` → `en`, `pt_BR` → `pt`. */
  private static toIso639Primary(language: string): string {
    const primary = language.trim().split(/[-_]/, 1)[0] ?? language;
    return primary.toLowerCase();
  }

  /** One of `allowed`, else `fallback` with a warning — never an unlisted value in `output_format`. */
  private static resolveBitrate<T extends number>(
    value: number | undefined,
    allowed: ReadonlySet<number>,
    fallback: T,
    label: string,
  ): T {
    if (value === undefined) {
      return fallback;
    }
    if (allowed.has(value)) {
      return value as T;
    }
    logger.warn(
      `[ElevenLabsTTSHandler] ${label} ${String(value)} is not one of ${[...allowed].join(", ")}; using ${fallback}`,
    );
    return fallback;
  }

  /** `Retry-After` as delta-seconds or an HTTP-date, in milliseconds. */
  private static parseRetryAfter(header: string | null): number | undefined {
    if (!header) {
      return undefined;
    }
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.round(seconds * 1000);
    }
    const at = Date.parse(header);
    if (Number.isFinite(at)) {
      return Math.max(0, at - Date.now());
    }
    return undefined;
  }

  /** A positive finite `timeoutMs`, clamped to the largest delay a timer honours; otherwise the default. */
  private static resolveTimeoutMs(timeoutMs: number | undefined): number {
    return typeof timeoutMs === "number" &&
      Number.isFinite(timeoutMs) &&
      timeoutMs > 0
      ? Math.min(timeoutMs, MAX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS;
  }

  private static resolveRetries(retries: number | undefined): number {
    return typeof retries === "number" &&
      Number.isInteger(retries) &&
      retries >= 0
      ? retries
      : DEFAULT_RETRIES;
  }

  private static normalizeBaseUrl(baseUrl: string): string {
    // A loop rather than /\/+$/: the input is caller-supplied and CodeQL
    // flags that regex as polynomial on long runs of "/".
    let end = baseUrl.length;
    while (end > 0 && baseUrl.charCodeAt(end - 1) === 47) {
      end--;
    }
    return baseUrl.slice(0, end);
  }

  /**
   * Assemble `voice_settings`. The camelCase options are the documented
   * surface; `voiceSettings` passes raw fields through and wins on conflict.
   * `speed` comes from the generic `TTSOptions.speed` (0.25–4.0) clamped into
   * ElevenLabs' accepted 0.7–1.2 — clamped with a warning rather than
   * rejected, because the generic validator has already accepted the value.
   */
  private buildVoiceSettings(
    options: ElevenLabsTTSOptions,
  ): ElevenLabsVoiceSettings {
    // Only DEFINED raw fields win: a spread copies an own key whose value is
    // `undefined`, which would erase the default (or the camelCase value)
    // and drop the field from the request body.
    const rawSettings = Object.fromEntries(
      Object.entries(options.voiceSettings ?? {}).filter(
        ([, value]) => value !== undefined,
      ),
    ) as Partial<ElevenLabsVoiceSettings>;
    const settings: ElevenLabsVoiceSettings = {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0.0,
      use_speaker_boost: options.useSpeakerBoost ?? true,
      ...rawSettings,
    };

    const requestedSpeed = settings.speed ?? options.speed;
    if (typeof requestedSpeed === "number" && Number.isFinite(requestedSpeed)) {
      const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, requestedSpeed));
      if (clamped !== requestedSpeed) {
        logger.warn(
          `[ElevenLabsTTSHandler] speed ${requestedSpeed} clamped to ${clamped}: ElevenLabs accepts ${SPEED_MIN}–${SPEED_MAX}`,
        );
      }
      settings.speed = clamped;
    }

    return settings;
  }

  /**
   * Map gender string to standard type
   */
  private mapGender(gender?: string): "male" | "female" | "neutral" {
    if (!gender) {
      return "neutral";
    }
    const lower = gender.toLowerCase();
    if (lower.includes("male") && !lower.includes("female")) {
      return "male";
    }
    if (lower.includes("female")) {
      return "female";
    }
    return "neutral";
  }

  /**
   * Map TTSAudioFormat to an ElevenLabs `output_format`.
   *
   * ElevenLabs has no `ogg_*` family: Ogg/Opus is `opus_48000_<kbps>`. Both
   * `ogg` and `opus` map there. `wav` maps to raw `pcm_44100` (headerless —
   * see `effectiveFormat`). Anything else falls back to `mp3_44100_128`.
   */
  private mapFormat(
    format: TTSAudioFormat,
    options: ElevenLabsTTSOptions,
  ): ElevenLabsOutputFormat {
    switch (format) {
      case "mp3":
      case "mpeg":
      case "mpga":
        return `mp3_44100_${ElevenLabsTTS.resolveBitrate(
          options.mp3Bitrate,
          MP3_BITRATES,
          DEFAULT_MP3_BITRATE,
          "mp3Bitrate",
        )}`;
      case "wav":
      case "pcm16":
        return "pcm_44100";
      case "ogg":
      case "opus":
        return `opus_48000_${ElevenLabsTTS.resolveBitrate(
          options.opusBitrate,
          OPUS_BITRATES,
          DEFAULT_OPUS_BITRATE,
          "opusBitrate",
        )}`;
      default:
        return "mp3_44100_128";
    }
  }

  /**
   * Get sample rate from format string
   */
  private getSampleRate(format: string): number {
    const parsed = SAMPLE_RATE_SEGMENT.exec(format)?.[1];
    if (parsed) {
      return Number(parsed);
    }
    return 44100;
  }

  /**
   * Map the ElevenLabs `output_format` string back to a canonical
   * TTSAudioFormat. mapFormat() falls back to mp3_44100_128 for unsupported
   * inputs, so this is needed to keep TTSResult.format honest.
   *
   * NOTE: ElevenLabs `pcm_*` outputs are RAW 16-bit signed-LE PCM samples
   * with no RIFF/WAV header. We surface that as `pcm16` (which exists in the
   * `TTSAudioFormat` union exactly for this case) — labeling it as `wav`
   * would cause consumers writing the buffer to a `.wav` file or feeding it
   * to a WAV parser to produce unplayable output (CodeRabbit review).
   */
  private effectiveFormat(outputFormat: string): TTSAudioFormat {
    if (outputFormat.startsWith("mp3")) {
      return "mp3";
    }
    if (outputFormat.startsWith("pcm")) {
      return "pcm16";
    }
    if (outputFormat.startsWith("opus") || outputFormat.startsWith("ogg")) {
      return "opus";
    }
    return "mp3";
  }
}
