/**
 * OpenAI Text-to-Speech Handler
 *
 * Implementation of TTS using OpenAI's TTS API.
 *
 * @module voice/providers/OpenAITTS
 */

import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice, AudioFormat } from "../../types/ttsTypes.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

/**
 * OpenAI TTS voices
 */
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * OpenAI TTS models
 */
export type OpenAITTSModel = "tts-1" | "tts-1-hd";

/**
 * OpenAI-specific TTS options
 */
export type OpenAITTSOptions = TTSOptions & {
  /** Model to use */
  model?: OpenAITTSModel;
};

/**
 * OpenAI Text-to-Speech Handler
 *
 * Supports high-quality neural TTS with multiple voices.
 *
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
export class OpenAITTSHandler implements TTSHandler {
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
    { id: "alloy", name: "Alloy", languageCode: "en", languageCodes: ["en"], gender: "neutral", type: "neural" },
    { id: "echo", name: "Echo", languageCode: "en", languageCodes: ["en"], gender: "male", type: "neural" },
    { id: "fable", name: "Fable", languageCode: "en", languageCodes: ["en"], gender: "neutral", type: "neural" },
    { id: "onyx", name: "Onyx", languageCode: "en", languageCodes: ["en"], gender: "male", type: "neural" },
    { id: "nova", name: "Nova", languageCode: "en", languageCodes: ["en"], gender: "female", type: "neural" },
    { id: "shimmer", name: "Shimmer", languageCode: "en", languageCodes: ["en"], gender: "female", type: "neural" },
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    // OpenAI voices are pre-defined, filter by language if provided
    if (languageCode && !languageCode.startsWith("en")) {
      // OpenAI TTS works with multiple languages but voices are English-named
      return OpenAITTSHandler.VOICES;
    }
    return OpenAITTSHandler.VOICES;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "OpenAI TTS API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const openaiOptions = options as OpenAITTSOptions;

    try {
      // Determine model based on quality
      const model: OpenAITTSModel =
        openaiOptions.model ??
        (options.quality === "hd" ? "tts-1-hd" : "tts-1");

      // Determine voice
      const voice = (options.voice as OpenAIVoice) ?? "alloy";

      // Determine format
      const responseFormat = this.mapFormat(options.format ?? "mp3");

      // Build request
      const requestBody = {
        model,
        input: text,
        voice,
        response_format: responseFormat,
        speed: options.speed ?? 1.0,
      };

      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { error?: { message?: string } }).error?.message ||
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
        voice,
        sampleRate: this.getSampleRate(options.format),
        metadata: {
          latency,
          provider: "openai-tts",
          model,
        },
      };

      logger.info(
        `[OpenAITTSHandler] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof TTSError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[OpenAITTSHandler] Synthesis failed: ${errorMessage}`);
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
   * Map AudioFormat to OpenAI response_format
   */
  private mapFormat(format: AudioFormat): string {
    const formats: Record<AudioFormat, string> = {
      mp3: "mp3",
      wav: "wav",
      ogg: "opus", // OpenAI uses opus for ogg
      opus: "opus",
    };
    return formats[format] ?? "mp3";
  }

  /**
   * Get sample rate for format
   */
  private getSampleRate(format?: AudioFormat): number {
    switch (format) {
      case "opus":
      case "ogg":
        return 48000;
      default:
        return 24000;
    }
  }
}
