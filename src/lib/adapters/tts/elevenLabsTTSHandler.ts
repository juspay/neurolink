/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Handler for ElevenLabs TTS API integration.
 * Supports streaming synthesis and voice cloning capabilities.
 *
 * @module adapters/tts/elevenLabsTTSHandler
 * @see https://elevenlabs.io/docs/api-reference
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  Gender,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/ttsTypes.js";
import type {
  TTSProvider,
  TTSStreamChunk,
  VoiceCapability,
} from "../../types/voiceTypes.js";
import { logger } from "../../utils/logger.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * ElevenLabs voice model options
 */
export type ElevenLabsModel =
  | "eleven_multilingual_v2"
  | "eleven_turbo_v2_5"
  | "eleven_turbo_v2"
  | "eleven_flash_v2_5"
  | "eleven_flash_v2"
  | "eleven_monolingual_v1";

/**
 * ElevenLabs-specific TTS options
 */
export type ElevenLabsTTSOptions = TTSOptions & {
  /** Voice model to use */
  model?: ElevenLabsModel;
  /** Stability (0-1) - higher = more consistent */
  stability?: number;
  /** Similarity boost (0-1) - higher = more similar to original voice */
  similarityBoost?: number;
  /** Style (0-1) - experimental emotional expression */
  style?: number;
  /** Use speaker boost for clearer audio */
  useSpeakerBoost?: boolean;
};

/**
 * ElevenLabs Text-to-Speech Handler
 *
 * Implements both TTSHandler (for backward compatibility) and TTSProvider interfaces.
 *
 * @example
 * ```typescript
 * const handler = new ElevenLabsTTSHandler();
 *
 * // Basic synthesis
 * const result = await handler.synthesize("Hello, world!", {
 *   voice: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
 *   format: "mp3",
 * });
 *
 * // Streaming synthesis
 * for await (const chunk of handler.synthesizeStream("Hello!", { voice: "..." })) {
 *   playAudioChunk(chunk.data);
 * }
 * ```
 */
export class ElevenLabsTTSHandler implements TTSHandler, TTSProvider {
  readonly name = "elevenlabs";
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.elevenlabs.io/v1";
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * ElevenLabs maximum text length per request
   * Free tier: 2,500 characters, Paid: 5,000+ characters
   */
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ELEVENLABS_API_KEY ?? null;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["tts", "streaming"];
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Validate provider configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.apiKey) {
      return { valid: false, errors: ["ELEVENLABS_API_KEY not configured"] };
    }

    // Test API key with a simple request
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: { "xi-api-key": this.apiKey },
      });
      return {
        valid: response.ok,
        errors: response.ok ? [] : ["Invalid API key"],
      };
    } catch {
      return { valid: false, errors: ["Network error validating API key"] };
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
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
      Date.now() - this.voicesCache.timestamp <
        ElevenLabsTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        voices: Array<{
          voice_id: string;
          name: string;
          labels?: { language?: string; accent?: string; gender?: string };
          preview_url?: string;
        }>;
      };

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        languageCode: voice.labels?.language ?? "en",
        languageCodes: [voice.labels?.language ?? "en"],
        gender: this.mapGender(voice.labels?.gender),
        type: "neural" as const,
        description: voice.labels?.accent,
      }));

      // Filter by language if specified
      const filteredVoices = languageCode
        ? voices.filter((v) => v.languageCode.startsWith(languageCode))
        : voices;

      // Cache if no filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return filteredVoices;
    } catch (err) {
      logger.error("Failed to fetch ElevenLabs voices:", err);
      return [];
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const elevenLabsOptions = options as ElevenLabsTTSOptions;

    // Default voice: Rachel (21m00Tcm4TlvDq8ikWAM)
    const voiceId = options.voice ?? "21m00Tcm4TlvDq8ikWAM";
    const model = elevenLabsOptions.model ?? "eleven_multilingual_v2";

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: this.getAcceptHeader(options.format ?? "mp3"),
          },
          body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: {
              stability: elevenLabsOptions.stability ?? 0.5,
              similarity_boost: elevenLabsOptions.similarityBoost ?? 0.75,
              style: elevenLabsOptions.style ?? 0,
              use_speaker_boost: elevenLabsOptions.useSpeakerBoost ?? true,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `ElevenLabs synthesis failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        metadata: {
          latency,
          provider: "elevenlabs",
          model,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `ElevenLabs synthesis failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Stream audio synthesis for real-time playback
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "ElevenLabs API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const voiceId = options.voice ?? "21m00Tcm4TlvDq8ikWAM";
    const elevenLabsOptions = options as ElevenLabsTTSOptions;
    const model = elevenLabsOptions.model ?? "eleven_flash_v2_5"; // Use flash model for streaming

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: elevenLabsOptions.stability ?? 0.5,
            similarity_boost: elevenLabsOptions.similarityBoost ?? 0.75,
          },
        }),
      },
    );

    if (!response.ok || !response.body) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `ElevenLabs streaming failed: ${response.status}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
      });
    }

    const reader = response.body.getReader();
    let index = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield {
            data: Buffer.alloc(0),
            index,
            isFinal: true,
            format: "mp3",
          };
          break;
        }

        yield {
          data: Buffer.from(value),
          index: index++,
          isFinal: false,
          format: "mp3",
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getAcceptHeader(format: string): string {
    switch (format) {
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "ogg":
        return "audio/ogg";
      default:
        return "audio/mpeg";
    }
  }

  private mapGender(gender?: string): Gender {
    if (!gender) {
      return "neutral";
    }
    const g = gender.toLowerCase();
    if (g === "male" || g === "m") {
      return "male";
    }
    if (g === "female" || g === "f") {
      return "female";
    }
    return "neutral";
  }
}
