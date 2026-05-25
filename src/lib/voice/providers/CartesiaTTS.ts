/**
 * Cartesia TTS Handler (synchronous /tts/bytes endpoint)
 *
 * Implements the standard `TTSHandler` synchronous-request contract on top
 * of Cartesia's REST `/tts/bytes` endpoint. The pre-existing
 * `adapters/tts/cartesiaHandler.ts` (`CartesiaStream`) targets the
 * realtime WebSocket flow used by the voice server and does NOT implement
 * `TTSHandler`; this file fills the gap so `nl.generate({ tts: { provider:
 * "cartesia" } })` works through the same `TTSProcessor` dispatch as
 * every other shipped TTS provider.
 *
 * @module voice/providers/CartesiaTTS
 * @see https://docs.cartesia.ai/api-reference/tts/bytes
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSAudioFormat,
  TTSHandler,
  TTSOptions,
  TTSResult,
} from "../../types/index.js";
import { withTimeout, TimeoutError } from "../../utils/async/withTimeout.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

const DEFAULT_BASE_URL = "https://api.cartesia.ai";
const DEFAULT_API_VERSION = "2025-04-16";
const DEFAULT_MODEL = "sonic-2";
// Same default voice as the streaming handler — a publicly available
// Cartesia voice id ("Bright Female"). Override per-call via TTSOptions.voice.
const DEFAULT_VOICE_ID = "694f9389-aac1-45b6-b726-9d9369183238";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Cartesia synchronous TTS handler.
 *
 * Auth: `X-API-Key: ${CARTESIA_API_KEY}` + `Cartesia-Version` header.
 */
export class CartesiaTTS implements TTSHandler {
  public readonly maxTextLength = 5000;

  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.CARTESIA_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (process.env.CARTESIA_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.apiVersion = process.env.CARTESIA_API_VERSION ?? DEFAULT_API_VERSION;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "CARTESIA_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const voiceId =
      options.voice ?? process.env.CARTESIA_VOICE_ID ?? DEFAULT_VOICE_ID;
    const requestedFormat: TTSAudioFormat = options.format ?? "mp3";
    const { container, encoding, sampleRate } =
      this.mapOutputFormat(requestedFormat);

    const cartesiaOpts = options as TTSOptions & {
      model?: string;
      language?: string;
    };
    const model =
      cartesiaOpts.model ?? process.env.CARTESIA_MODEL ?? DEFAULT_MODEL;

    const body: Record<string, unknown> = {
      model_id: model,
      transcript: text,
      voice: { mode: "id", id: voiceId },
      output_format: {
        container,
        encoding,
        sample_rate: sampleRate,
      },
      language: cartesiaOpts.language ?? "en",
    };

    let response: Response;
    try {
      response = await withTimeout(
        fetch(`${this.baseUrl}/tts/bytes`, {
          method: "POST",
          headers: {
            "X-API-Key": this.apiKey,
            "Cartesia-Version": this.apiVersion,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        REQUEST_TIMEOUT_MS,
        `Cartesia request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
      );
    } catch (err: unknown) {
      if (err instanceof TimeoutError) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: err.message,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Cartesia network error: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Cartesia synthesis failed: ${response.status} — ${text}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status, voiceId, container, encoding },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const latency = Date.now() - startTime;
    const effectiveFormat = this.effectiveFormat(container, encoding);

    const result: TTSResult = {
      buffer: audioBuffer,
      format: effectiveFormat,
      size: audioBuffer.length,
      voice: voiceId,
      sampleRate,
      metadata: {
        latency,
        provider: "cartesia",
        model,
        requestedFormat: options.format,
        container,
        encoding,
      },
    };

    logger.info(
      `[CartesiaTTS] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
    );
    return result;
  }

  private mapOutputFormat(format: TTSAudioFormat): {
    container: "mp3" | "wav" | "raw";
    encoding: "mp3" | "pcm_s16le" | "pcm_f32le";
    sampleRate: number;
  } {
    switch (format) {
      case "mp3":
        return { container: "mp3", encoding: "mp3", sampleRate: 44_100 };
      case "wav":
        return { container: "wav", encoding: "pcm_s16le", sampleRate: 44_100 };
      case "pcm16":
        return { container: "raw", encoding: "pcm_s16le", sampleRate: 24_000 };
      default:
        // Cartesia only supports mp3 / wav / pcm16 today. Fail fast instead
        // of silently downgrading so callers passing ogg / flac / m4a /
        // opus / webm see a clear error rather than mislabeled MP3 bytes.
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Cartesia does not support output format "${format}". Supported: mp3, wav, pcm16.`,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: {
            format,
            supported: ["mp3", "wav", "pcm16"],
          },
        });
    }
  }

  private effectiveFormat(
    container: "mp3" | "wav" | "raw",
    encoding: "mp3" | "pcm_s16le" | "pcm_f32le",
  ): TTSAudioFormat {
    if (container === "mp3") {
      return "mp3";
    }
    if (container === "wav") {
      return "wav";
    }
    if (encoding === "pcm_s16le") {
      return "pcm16";
    }
    // In practice mapOutputFormat() throws before we reach this branch
    // (it only emits mp3/wav/raw containers from a validated input).
    // Throwing here too means a future container/encoding combination
    // surfaces clearly instead of returning mislabeled bytes as "mp3".
    throw new TTSError({
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: `Unsupported Cartesia output combination: container=${container}, encoding=${encoding}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { container, encoding },
    });
  }
}
