/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Implementation of TTS using ElevenLabs API.
 *
 * @module voice/providers/ElevenLabsTTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  AudioFormat,
  ElevenLabsTTSOptions,
  ElevenLabsVoicesResponse,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Supports high-quality multilingual TTS with voice cloning.
 *
 * @see https://elevenlabs.io/docs/api-reference
 */
export class ElevenLabsTTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Maximum text length (5000 characters)
   */
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ELEVENLABS_API_KEY ?? null;
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
      const voicesTimeoutId = setTimeout(() => voicesController.abort(), 30000);
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
            message: "ElevenLabs voices request timed out after 30 seconds",
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
        voices = voices.filter((v) =>
          v.languageCodes?.some((code) =>
            code.toLowerCase().startsWith(requested),
          ),
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
      // Get voice ID (use default if not specified)
      const voiceId = options.voice ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel voice as default

      // Determine model
      const model = elevenOptions.model ?? "eleven_multilingual_v2";

      // Build request body
      const requestBody = {
        text,
        model_id: model,
        voice_settings: {
          stability: elevenOptions.stability ?? 0.5,
          similarity_boost: elevenOptions.similarityBoost ?? 0.75,
          style: elevenOptions.style ?? 0.0,
          use_speaker_boost: elevenOptions.useSpeakerBoost ?? true,
        },
      };

      // Determine output format
      const outputFormat = this.mapFormat(options.format ?? "mp3");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(
          `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": this.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          },
        );
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "ElevenLabs TTS request timed out after 30 seconds",
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            originalError: fetchErr,
          });
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => Object.create(null) as Record<string, unknown>);
        const errorMessage =
          (errorData as { detail?: { message?: string } }).detail?.message ||
          `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const latency = Date.now() - startTime;

      // Get audio buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const result: TTSResult = {
        buffer: audioBuffer,
        format: options.format ?? "mp3",
        size: audioBuffer.length,
        voice: voiceId,
        sampleRate: this.getSampleRate(outputFormat),
        metadata: {
          latency,
          provider: "elevenlabs-tts",
          model,
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
        retriable: true,
        context: { textLength: text.length },
        originalError: err instanceof Error ? err : undefined,
      });
    }
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
   * Map AudioFormat to ElevenLabs output format
   */
  private mapFormat(format: AudioFormat): string {
    const formats: Partial<Record<AudioFormat, string>> = {
      mp3: "mp3_44100_128",
      wav: "pcm_44100",
      ogg: "ogg_22050",
      opus: "ogg_22050",
    };
    return formats[format] ?? "mp3_44100_128";
  }

  /**
   * Get sample rate from format string
   */
  private getSampleRate(format: string): number {
    if (format.includes("44100")) {
      return 44100;
    }
    if (format.includes("22050")) {
      return 22050;
    }
    if (format.includes("24000")) {
      return 24000;
    }
    return 44100;
  }
}
