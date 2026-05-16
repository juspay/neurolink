/**
 * Fish Audio TTS Handler
 *
 * Implementation of TTS using Fish Audio API. Lower-cost alternative to
 * ElevenLabs with strong multilingual support and 15s voice cloning.
 *
 * @module voice/providers/FishAudioTTS
 * @see https://docs.fish.audio/text-to-speech/text-to-speech
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  TTSAudioFormat,
  TTSHandler,
  TTSOptions,
  TTSResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

const DEFAULT_BASE_URL = "https://api.fish.audio";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Default reference voice — "Energetic Male" by official author `lengyue`,
 * a long-standing public English voice on Fish Audio.
 *
 * @see https://fish.audio (model id 802e3bc2b27e49c2995d23ef70e6ac89)
 *
 * Note: the previous default `fb6c0e1ea91e427fb9a93b9bbf0a1e4d` was
 * removed upstream and started returning 400 "Reference not found".
 */
const DEFAULT_REFERENCE_ID = "802e3bc2b27e49c2995d23ef70e6ac89";

/**
 * Fish Audio Text-to-Speech Handler.
 *
 * Auth: `Authorization: Bearer ${FISH_AUDIO_API_KEY}`.
 * Models: speech-1.5 (standard), speech-1.6, s1 (default; latest).
 */
export class FishAudioTTS implements TTSHandler {
  public readonly maxTextLength = 5000;

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.FISH_AUDIO_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (
      process.env.FISH_AUDIO_BASE_URL ?? DEFAULT_BASE_URL
    ).replace(/\/$/, "");
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "FISH_AUDIO_API_KEY not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const referenceId = options.voice ?? DEFAULT_REFERENCE_ID;
    const requestedFormat: TTSAudioFormat = options.format ?? "mp3";
    const upstreamFormat = this.mapFormat(requestedFormat);

    const body: Record<string, unknown> = {
      text,
      reference_id: referenceId,
      format: upstreamFormat,
      mp3_bitrate: 128,
      chunk_length: 200,
      normalize: true,
      latency: "normal",
    };

    const fishOpts = options as TTSOptions & {
      model?: "speech-1.5" | "speech-1.6" | "s1";
      latency?: "normal" | "balanced";
      mp3Bitrate?: 64 | 128 | 192;
    };
    if (fishOpts.model) {
      body.model = fishOpts.model;
    }
    if (fishOpts.latency) {
      body.latency = fishOpts.latency;
    }
    if (fishOpts.mp3Bitrate !== undefined) {
      body.mp3_bitrate = fishOpts.mp3Bitrate;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Fish Audio request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Fish Audio network error: ${err instanceof Error ? err.message : String(err)}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      const retriable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Fish Audio synthesis failed: ${response.status} — ${text}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status, referenceId, upstreamFormat },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const latency = Date.now() - startTime;

    const effectiveFormat = this.effectiveFormat(upstreamFormat);

    const result: TTSResult = {
      buffer: audioBuffer,
      format: effectiveFormat,
      size: audioBuffer.length,
      voice: referenceId,
      sampleRate: this.getSampleRate(effectiveFormat),
      metadata: {
        latency,
        provider: "fish-audio",
        model: fishOpts.model ?? "s1",
        requestedFormat: options.format,
        upstreamFormat,
      },
    };

    logger.info(
      `[FishAudioTTS] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
    );
    return result;
  }

  private mapFormat(format: TTSAudioFormat): string {
    const supported: Partial<Record<TTSAudioFormat, string>> = {
      mp3: "mp3",
      wav: "wav",
      pcm16: "pcm",
    };
    const mapped = supported[format];
    if (!mapped) {
      logger.warn(
        `[FishAudioTTS] Unsupported format "${format}" — falling back to "mp3"`,
      );
      return "mp3";
    }
    return mapped;
  }

  private effectiveFormat(upstreamFormat: string): TTSAudioFormat {
    if (upstreamFormat === "mp3") {
      return "mp3";
    }
    if (upstreamFormat === "wav") {
      return "wav";
    }
    if (upstreamFormat === "pcm") {
      return "pcm16";
    }
    return "mp3";
  }

  private getSampleRate(format: TTSAudioFormat): number {
    if (format === "wav") {
      return 44_100;
    }
    if (format === "pcm16") {
      return 44_100;
    }
    return 44_100;
  }
}
