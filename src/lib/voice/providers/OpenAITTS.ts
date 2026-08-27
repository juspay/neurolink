/**
 * OpenAI Text-to-Speech Handler
 *
 * Implementation of TTS using OpenAI's TTS API.
 *
 * @module voice/providers/OpenAITTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSAudioFormat,
  OpenAITTSModel,
  OpenAITTSOptions,
  OpenAIVoice,
  PreparedOpenAITTSRequest,
  TTSChunk,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { attachStreamCancel } from "../../utils/streamCancellation.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * OpenAI Text-to-Speech Handler
 *
 * Supports high-quality neural TTS with multiple voices.
 *
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
/**
 * Converts an arbitrary thrown value to a loggable string without running
 * code the value controls unguarded — `.message` can be a throwing accessor
 * and `String()` can hit a hostile `toString`/`Symbol.toPrimitive` or a
 * null-prototype object. Mirrors the processor-side helper of the same name.
 */
function safeErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return String(error.message);
    }
    return String(error);
  } catch {
    return "[unprintable error]";
  }
}

/**
 * `instanceof` performs a prototype lookup, which a `Proxy` with a throwing
 * `getPrototypeOf` trap — or a revoked one — turns into a throw of its own.
 * Classifying a transport failure must never become the failure. Mirrors the
 * processor-side helper of the same name.
 */
function safeInstanceOf<T>(
  value: unknown,
  ctor: abstract new (...args: never[]) => T,
): value is T {
  try {
    return value instanceof ctor;
  } catch {
    return false;
  }
}

/**
 * Both the class test and the `.name` read can execute code the thrown value
 * controls, and the abort branch needs the answer to both.
 */
function isAbortError(error: unknown): boolean {
  try {
    return error instanceof Error && error.name === "AbortError";
  } catch {
    return false;
  }
}

/**
 * Reduce a caught value to an `Error` that is safe to attach as
 * `originalError`. The structured-error constructor reads `.stack` and
 * `.message` unguarded, so a throwing accessor there escapes the shaper
 * itself. Forward the original only once those reads are proven to succeed,
 * and otherwise carry the already-safe message on a plain `Error` with no
 * accessors of its own. Mirrors the processor-side helper of the same name.
 */
function toSafeOriginalError(
  error: unknown,
  safeMessage: string,
): Error | undefined {
  if (!safeInstanceOf(error, Error)) {
    return undefined;
  }
  try {
    String(error.name);
    String(error.message);
    String(error.stack);
    return error;
  } catch {
    return new Error(safeMessage);
  }
}

/**
 * Build the shaped error, retrying without the original if attaching it
 * throws. A one-shot accessor can answer one way when it is checked and
 * another when the structured-error constructor reads it; the retry drops the
 * original rather than the shaped failure. Mirrors the processor-side helper
 * of the same name.
 */
function buildTTSError(
  details: ConstructorParameters<typeof TTSError>[0],
  originalError: Error | undefined,
): TTSError {
  try {
    return new TTSError({ ...details, originalError });
  } catch {
    return new TTSError(details);
  }
}

/**
 * A value may pass `safeInstanceOf` by LYING — a `Proxy` whose
 * `getPrototypeOf` answers `TTSError.prototype` while every `get` detonates.
 * Passing one through as "already shaped" hands the hostile value to every
 * downstream consumer (mirrors the processor-side helper). Trust the claim only when the reads those consumers
 * perform succeed here, where a throw is contained.
 */
function isReadableTTSError(value: unknown): value is TTSError {
  if (!safeInstanceOf(value, TTSError)) {
    return false;
  }
  try {
    String(value.name);
    String(value.message);
    String(value.code);
    void value.retriable;
    String(value.stack);
    return true;
  } catch {
    return false;
  }
}

export class OpenAITTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * Maximum text length (4096 characters)
   */
  public readonly maxTextLength = 4096;

  /**
   * Available voices
   */
  private static readonly VOICES: TTSVoice[] = [
    {
      id: "alloy",
      name: "Alloy",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
    },
    {
      id: "echo",
      name: "Echo",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
    },
    {
      id: "fable",
      name: "Fable",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
    },
    {
      id: "onyx",
      name: "Onyx",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
    },
    {
      id: "nova",
      name: "Nova",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
    },
    {
      id: "shimmer",
      name: "Shimmer",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
    },
  ];

  constructor(apiKey?: string) {
    const resolvedKey = (apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    // OpenAI voices are pre-defined, filter by language if provided
    if (languageCode && !languageCode.startsWith("en")) {
      // OpenAI TTS works with multiple languages but voices are English-named
      return OpenAITTS.VOICES;
    }
    return OpenAITTS.VOICES;
  }

  private requireApiKey(): string {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI TTS API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }
    return this.apiKey;
  }

  private prepareRequest(
    text: string,
    options: TTSOptions,
  ): PreparedOpenAITTSRequest {
    const openaiOptions = options as OpenAITTSOptions;
    const model: OpenAITTSModel =
      openaiOptions.model ?? (options.quality === "hd" ? "tts-1-hd" : "tts-1");
    const voice = (options.voice as OpenAIVoice) ?? "alloy";
    const responseFormat = this.mapFormat(options.format ?? "mp3");
    return {
      model,
      voice,
      responseFormat,
      effectiveFormat: this.effectiveFormat(responseFormat),
      body: {
        model,
        input: text,
        voice,
        response_format: responseFormat,
        speed: options.speed ?? 1.0,
      },
    };
  }

  /**
   * Issue the speech request and reject non-2xx responses.
   *
   * `onHeaders` runs as soon as the request settles, before the response body
   * is touched at all. The buffered path clears its request timeout there,
   * which is where it has always been cleared: the 30-second bound covers
   * getting a response, not downloading one. The native path passes no
   * callback, keeping its own timeout armed across the body reads it owns.
   */
  private async createSpeechResponse(
    request: PreparedOpenAITTSRequest,
    signal: AbortSignal,
    onHeaders?: () => void,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.requireApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
        signal,
      });
    } finally {
      onHeaders?.();
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => Object.create(null) as Record<string, unknown>);
      const errorMessage =
        (errorData as { error?: { message?: string } }).error?.message ||
        `HTTP ${response.status}`;
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: errorMessage,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: {
          status: response.status,
          model: request.model,
          responseFormat: request.responseFormat,
        },
      });
    }

    return response;
  }

  private synthesisError(
    error: unknown,
    textLength: number,
    timedOut: boolean,
  ): TTSError {
    if (isReadableTTSError(error)) {
      return error;
    }
    if (isAbortError(error) && timedOut) {
      return buildTTSError(
        {
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "OpenAI TTS request timed out after 30 seconds",
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        },
        toSafeOriginalError(error, safeErrorMessage(error)),
      );
    }

    const errorMessage = error ? safeErrorMessage(error) : "Unknown error";
    logger.error(`[OpenAITTSHandler] Synthesis failed: ${errorMessage}`);
    return buildTTSError(
      {
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Synthesis failed: ${errorMessage}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { textLength },
      },
      toSafeOriginalError(error, errorMessage),
    );
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    this.requireApiKey();

    const startTime = Date.now();
    const request = this.prepareRequest(text, options);
    const controller = new AbortController();
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => {
        timedOut = true;
        controller.abort();
      },
      30000,
    );
    // Disarmed the moment a response comes back, so the timeout bounds the
    // request and not the audio download that follows it. Bounding the
    // download too would fail a large but perfectly healthy synthesis that
    // takes more than 30 seconds to transfer.
    const clearRequestTimeout = (): void => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    try {
      const response = await this.createSpeechResponse(
        request,
        controller.signal,
        clearRequestTimeout,
      );
      // Measured BEFORE the body download, exactly as it was before this
      // method was refactored: `metadata.latency` reports time-to-response,
      // not time-to-last-byte. Moving it past `arrayBuffer()` silently changed
      // a public metric — `TTSResult.metadata` reaches callers through
      // `TTSProcessor.synthesize()` and through `generate({ tts })`.
      const latency = Date.now() - startTime;
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const result: TTSResult = {
        buffer: audioBuffer,
        format: request.effectiveFormat,
        size: audioBuffer.length,
        voice: request.voice,
        sampleRate: this.getSampleRate(request.effectiveFormat),
        metadata: {
          latency,
          provider: "openai-tts",
          model: request.model,
          requestedFormat: options.format,
          responseFormat: request.responseFormat,
        },
      };

      logger.info(
        `[OpenAITTSHandler] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      throw this.synthesisError(err, text.length, timedOut);
    } finally {
      clearRequestTimeout();
    }
  }

  /**
   * Stream one segment's audio as the response body arrives.
   *
   * Returns `undefined` for any format without direct wire proof of
   * incremental delivery, which selects the buffered `synthesize()` path.
   *
   * Every non-empty body read is yielded as soon as it is available and
   * carries `isFinal: false`: assigning finality here would require a
   * one-read lookahead, delaying every fragment by a full body read, and
   * `TTSProcessor` recomputes finality globally anyway.
   */
  synthesizeStream(
    text: string,
    options: TTSOptions = {},
  ): AsyncIterable<TTSChunk> | undefined {
    const requestedFormat = options.format ?? "mp3";
    if (requestedFormat !== "mp3" && requestedFormat !== "pcm16") {
      return undefined;
    }

    const request = this.prepareRequest(text, options);
    const handler = this;
    let controller: AbortController | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancelled = false;
    let timedOut = false;
    let bodyComplete = false;

    const stream = (async function* (): AsyncGenerator<TTSChunk> {
      handler.requireApiKey();
      const startedAt = Date.now();
      controller = new AbortController();
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller?.abort();
      }, 30000);

      try {
        const response = await handler.createSpeechResponse(
          request,
          controller.signal,
        );
        if (!response.body) {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "OpenAI TTS response did not include an audio body",
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
          });
        }

        reader = response.body.getReader();
        let index = 0;
        let cumulativeSize = 0;

        while (true) {
          const result = await reader.read();
          if (result.done) {
            bodyComplete = true;
            break;
          }
          const data = Buffer.from(result.value);
          if (data.length === 0) {
            continue;
          }
          cumulativeSize += data.length;
          yield {
            data,
            format: request.effectiveFormat,
            index: index++,
            // Deliberately never `true`. Marking the last read would mean
            // holding one read back until the next one arrives, which delays
            // every fragment by a full body read; `TTSProcessor` already
            // recomputes exactly one final chunk across all segments and
            // discards whatever finality a handler reports. See the
            // `synthesizeStream` contract in `TTSHandler`.
            isFinal: false,
            cumulativeSize,
            voice: request.voice,
            sampleRate: handler.getSampleRate(request.effectiveFormat),
          };
        }

        logger.info(
          `[OpenAITTSHandler] Streamed ${cumulativeSize} bytes in ${Date.now() - startedAt}ms`,
        );
      } catch (err: unknown) {
        if (cancelled && isAbortError(err)) {
          return;
        }
        throw handler.synthesisError(err, text.length, timedOut);
      } finally {
        clearTimeout(timeoutId);
        if (!bodyComplete) {
          controller?.abort();
        }
        try {
          reader?.releaseLock();
        } catch {
          // The reader may already be errored or released during cancellation.
        }
        reader = undefined;
        controller = undefined;
      }
    })();

    return attachStreamCancel(stream, () => {
      cancelled = true;
      controller?.abort();
    });
  }

  /**
   * Map TTSAudioFormat to OpenAI response_format.
   *
   * OpenAI's /audio/speech accepts mp3, opus, aac, flac, wav and pcm. This map
   * previously stopped at mp3/wav/ogg/opus/pcm16, so `flac` — a valid
   * TTSAudioFormat *and* a real OpenAI response_format — was treated as
   * unsupported and silently downgraded to mp3 (#479). A caller who asked for
   * lossless got lossy, and the only signal was a warn-level log.
   *
   * Formats OpenAI genuinely cannot produce still coerce to mp3 with a warning.
   */
  private mapFormat(format: TTSAudioFormat): string {
    const formats: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "mp3",
      wav: "wav",
      ogg: "opus", // OpenAI uses opus for ogg
      opus: "opus",
      // #479: flac is the entry this fix added. It is a first-class OpenAI
      // response_format and was the only TTSAudioFormat member missing from
      // this map, so it fell through to the mp3 coercion below. The issue also
      // mentions aac, but aac is not a member of TTSAudioFormat and therefore
      // cannot be requested — no mapping is needed or possible for it.
      flac: "flac",
      // OpenAI's "pcm" is raw 16-bit signed LE @ 24kHz (no header) — maps to
      // canonical pcm16 in TTSResult.format. See effectiveFormat() below.
      pcm16: "pcm",
    };
    const mapped = formats[format];
    if (mapped === undefined) {
      logger.warn(
        `[OpenAITTSHandler] Unsupported format "${format}" — falling back to "mp3". Supported formats: mp3, wav, ogg, opus, flac, pcm16.`,
      );
      return "mp3";
    }
    return mapped;
  }

  /**
   * Get sample rate for format
   */
  private getSampleRate(format?: TTSAudioFormat): number {
    switch (format) {
      case "opus":
      case "ogg":
        return 48000;
      default:
        return 24000;
    }
  }

  /**
   * Map the OpenAI `response_format` string back to the canonical
   * `TTSAudioFormat` so `TTSResult.format` reflects what the API actually
   * returned (mapFormat() coerces unsupported requests to "mp3"). Note:
   * OpenAI returns Ogg-Opus for both "ogg" and "opus" requests — both
   * surface as "opus" since the bytes are an .ogg/Opus container.
   */
  private effectiveFormat(responseFormat: string): TTSAudioFormat {
    switch (responseFormat) {
      case "mp3":
        return "mp3";
      case "wav":
        return "wav";
      case "opus":
        return "opus";
      case "flac":
        return "flac";
      // Raw PCM (16-bit signed LE @ 24kHz, no header) — keep semantics in
      // TTSResult.format so consumers don't write raw bytes to a .wav file.
      case "pcm":
        return "pcm16";
      default:
        return "mp3";
    }
  }
}
