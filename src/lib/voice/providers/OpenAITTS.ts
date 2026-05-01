/**
 * OpenAI Text-to-Speech Handler
 *
 * Implementation of TTS using OpenAI's TTS API.
 *
 * @module voice/providers/OpenAITTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  AudioFormat,
  OpenAITTSModel,
  OpenAITTSOptions,
  OpenAIVoice,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * OpenAI Text-to-Speech Handler
 *
 * Supports high-quality neural TTS with multiple voices.
 *
 * @see https://platform.openai.com/docs/api-reference/audio/createSpeech
 */
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
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/audio/speech`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "OpenAI TTS request timed out after 30 seconds",
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
   * Map AudioFormat to OpenAI response_format.
   * OpenAI TTS supports: mp3, wav, opus (ogg maps to opus).
   * Unsupported formats are coerced to mp3 with a warning.
   */
  private mapFormat(format: AudioFormat): string {
    const formats: Partial<Record<AudioFormat, string>> = {
      mp3: "mp3",
      wav: "wav",
      ogg: "opus", // OpenAI uses opus for ogg
      opus: "opus",
    };
    const mapped = formats[format];
    if (mapped === undefined) {
      logger.warn(
        `[OpenAITTSHandler] Unsupported format "${format}" — falling back to "mp3". Supported formats: mp3, wav, ogg, opus.`,
      );
      return "mp3";
    }
    return mapped;
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
