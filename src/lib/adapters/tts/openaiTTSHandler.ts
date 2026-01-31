/**
 * OpenAI Text-to-Speech Handler
 *
 * Handler for OpenAI TTS API integration.
 *
 * @module adapters/tts/openaiTTSHandler
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import type { TTSProvider, VoiceCapability } from "../../types/voiceTypes.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * OpenAI TTS voice options
 */
export type OpenAITTSVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "sage"
  | "shimmer"
  | "verse";

/**
 * OpenAI TTS model options
 */
export type OpenAITTSModel = "tts-1" | "tts-1-hd" | "gpt-4o-mini-tts";

/**
 * OpenAI-specific TTS options
 */
export type OpenAITTSOptions = TTSOptions & {
  /** TTS model: tts-1 (faster) or tts-1-hd (higher quality) */
  model?: OpenAITTSModel;
};

/**
 * OpenAI Text-to-Speech Handler
 *
 * @example
 * ```typescript
 * const handler = new OpenAITTSHandler();
 *
 * const result = await handler.synthesize("Hello, world!", {
 *   voice: "alloy",
 *   format: "mp3",
 *   speed: 1.0,
 * });
 * ```
 */
export class OpenAITTSHandler implements TTSHandler, TTSProvider {
  readonly name = "openai-tts";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  /**
   * OpenAI TTS maximum input: 4096 characters
   */
  public readonly maxTextLength = 4096;

  /**
   * Available OpenAI TTS voices (static, no API discovery)
   */
  private static readonly VOICES: TTSVoice[] = [
    {
      id: "alloy",
      name: "Alloy",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Neutral and balanced voice",
    },
    {
      id: "ash",
      name: "Ash",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Warm and conversational voice",
    },
    {
      id: "ballad",
      name: "Ballad",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Soft and melodic voice",
    },
    {
      id: "coral",
      name: "Coral",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
      description: "Warm and expressive voice",
    },
    {
      id: "echo",
      name: "Echo",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
      description: "Deep and resonant voice",
    },
    {
      id: "fable",
      name: "Fable",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Expressive and animated voice",
    },
    {
      id: "onyx",
      name: "Onyx",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "male",
      type: "neural",
      description: "Deep and authoritative voice",
    },
    {
      id: "nova",
      name: "Nova",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
      description: "Friendly and upbeat voice",
    },
    {
      id: "sage",
      name: "Sage",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Calm and wise voice",
    },
    {
      id: "shimmer",
      name: "Shimmer",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "female",
      type: "neural",
      description: "Clear and bright voice",
    },
    {
      id: "verse",
      name: "Verse",
      languageCode: "en",
      languageCodes: ["en"],
      gender: "neutral",
      type: "neural",
      description: "Poetic and flowing voice",
    },
  ];

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["tts"];
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
      return { valid: false, errors: ["OPENAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get available voices
   * OpenAI doesn't have a voices discovery API - returns static list
   */
  async getVoices(_languageCode?: string): Promise<TTSVoice[]> {
    // OpenAI voices support multiple languages through the model
    return OpenAITTSHandler.VOICES;
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI API key not configured. Set OPENAI_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const openaiOptions = options as OpenAITTSOptions;

    const voice = (options.voice ?? "alloy") as OpenAITTSVoice;
    const model = openaiOptions.model ?? "tts-1";
    const responseFormat = this.mapFormat(options.format ?? "mp3");

    try {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: text,
          voice,
          response_format: responseFormat,
          speed: options.speed ?? 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => {
          // Fallback to empty object if JSON parsing fails
          return {};
        })) as {
          error?: { message?: string };
        };
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `OpenAI TTS failed: ${response.status} - ${errorData.error?.message ?? "Unknown error"}`,
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
        voice,
        metadata: {
          latency,
          provider: "openai",
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
        message: `OpenAI TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  private mapFormat(format: string): string {
    switch (format) {
      case "mp3":
        return "mp3";
      case "wav":
        return "wav";
      case "ogg":
        return "opus";
      case "opus":
        return "opus";
      case "flac":
        return "flac";
      default:
        return "mp3";
    }
  }
}
