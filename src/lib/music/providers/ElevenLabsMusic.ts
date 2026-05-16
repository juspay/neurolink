/**
 * ElevenLabs Music / Sound Generation Handler
 *
 * Distinct from ElevenLabs TTS — uses the `/v1/sound-generation` endpoint
 * (synchronous; returns binary audio directly, no polling).
 *
 * @module music/providers/ElevenLabsMusic
 * @see https://elevenlabs.io/docs/api-reference/sound-generation
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { MUSIC_ERROR_CODES, MusicError } from "../../utils/musicProcessor.js";
import { logger } from "../../utils/logger.js";
import { MAX_AUDIO_BYTES, readBoundedBuffer } from "../../utils/sizeGuard.js";
import type {
  MusicAudioFormat,
  MusicHandler,
  MusicOptions,
  MusicResult,
} from "../../types/index.js";

const DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
const REQUEST_TIMEOUT_MS = 60_000; // longer because synchronous generation

/**
 * ElevenLabs Music / Sound Generation Handler.
 *
 * Auth: `xi-api-key: ${ELEVENLABS_API_KEY}` (shares the same env var as
 * ElevenLabs TTS — same account; different endpoint).
 *
 * Best for: short sound effects (ambient drones, hits, foley) and short
 * music loops up to 22 seconds.
 */
export class ElevenLabsMusic implements MusicHandler {
  public readonly maxDurationSeconds = 22;
  public readonly supportedFormats: readonly MusicAudioFormat[] = ["mp3"];
  public readonly supportedGenres: readonly string[] = [
    "ambient",
    "cinematic",
    "lo-fi",
    "electronic",
    "orchestral",
    "soundscape",
  ];

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(apiKey?: string) {
    const resolved = (apiKey ?? process.env.ELEVENLABS_API_KEY ?? "").trim();
    this.apiKey = resolved.length > 0 ? resolved : null;
    this.baseUrl = (
      process.env.ELEVENLABS_BASE_URL ?? DEFAULT_BASE_URL
    ).replace(/\/$/, "");
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async generate(options: MusicOptions): Promise<MusicResult> {
    if (!this.apiKey) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "ELEVENLABS_API_KEY not configured (shared with ElevenLabs TTS — same account, different endpoint)",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const promptText = options.prompt?.trim();
    if (!promptText) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.INVALID_INPUT,
        message: "ElevenLabs Music requires a non-empty prompt",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retriable: false,
      });
    }

    const requestedDuration = options.duration ?? 8;
    if (requestedDuration <= 0 || requestedDuration > this.maxDurationSeconds) {
      throw new MusicError({
        code: MUSIC_ERROR_CODES.INVALID_INPUT,
        message: `ElevenLabs Music duration must be between 1 and ${this.maxDurationSeconds} seconds; got ${requestedDuration}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retriable: false,
        context: {
          requested: requestedDuration,
          maximum: this.maxDurationSeconds,
        },
      });
    }

    const startTime = Date.now();
    const duration = requestedDuration;

    const body = {
      text: this.buildPrompt({ ...options, prompt: promptText }),
      duration_seconds: duration,
      prompt_influence: 0.3,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/sound-generation`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.GENERATION_FAILED,
          message: `ElevenLabs Music request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          originalError: err,
        });
      }
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `ElevenLabs Music network error: ${err instanceof Error ? err.message : String(err)}`,
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
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `ElevenLabs Music synthesis failed: ${response.status} — ${text}`,
        category: retriable ? ErrorCategory.NETWORK : ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable,
        context: { status: response.status },
      });
    }

    const buffer = await readBoundedBuffer(
      response,
      MAX_AUDIO_BYTES,
      "ElevenLabs music",
    );
    const latency = Date.now() - startTime;
    logger.info(
      `[ElevenLabsMusic] Generated ${buffer.length} bytes in ${latency}ms`,
    );

    return {
      buffer,
      format: "mp3",
      size: buffer.length,
      duration,
      provider: "elevenlabs-music",
      metadata: {
        latency,
        provider: "elevenlabs-music",
        model: "elevenlabs-sound-v1",
      },
    };
  }

  private buildPrompt(options: MusicOptions): string {
    const parts = [options.prompt];
    if (options.genre) {
      parts.push(`Genre: ${options.genre}`);
    }
    if (options.mood) {
      parts.push(`Mood: ${options.mood}`);
    }
    if (options.tempo !== undefined) {
      parts.push(`${options.tempo} BPM`);
    }
    return parts.join(". ");
  }
}
