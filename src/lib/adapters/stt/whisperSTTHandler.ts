/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Handler for OpenAI Whisper STT API integration.
 *
 * @module adapters/stt/whisperSTTHandler
 * @see https://platform.openai.com/docs/api-reference/audio/createTranscription
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "../../types/sttTypes.js";
import {
  STT_ERROR_CODES,
  VALID_STT_AUDIO_FORMATS,
} from "../../types/sttTypes.js";
import type { STTProvider, VoiceCapability } from "../../types/voiceTypes.js";
import { STTError } from "../../voice/errors.js";

/**
 * Whisper-specific STT options
 */
export type WhisperSTTOptions = STTOptions & {
  /** Whisper model: whisper-1 (default) */
  model?: "whisper-1";
  /** Response format: json, text, srt, verbose_json, vtt */
  responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  /** Temperature for sampling (0-1) */
  temperature?: number;
  /** Optional text to guide the model's style */
  prompt?: string;
};

/**
 * Whisper verbose JSON response
 */
type WhisperVerboseResponse = {
  task: string;
  language: string;
  duration: number;
  text: string;
  segments: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
};

/**
 * Whisper JSON response (simple)
 */
type WhisperSimpleResponse = {
  text: string;
};

/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * @example
 * ```typescript
 * const handler = new WhisperSTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en",
 *   responseFormat: "verbose_json",
 * });
 * ```
 */
export class WhisperSTTHandler implements STTProvider {
  readonly name = "whisper";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  /**
   * Supported audio formats
   */
  private static readonly SUPPORTED_FORMATS = [
    "mp3",
    "mp4",
    "mpeg",
    "mpga",
    "m4a",
    "wav",
    "webm",
  ];

  /**
   * Maximum file size (25 MB)
   */
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024;

  /**
   * Supported languages (ISO-639-1 codes)
   */
  private static readonly SUPPORTED_LANGUAGES = [
    "af",
    "ar",
    "hy",
    "az",
    "be",
    "bs",
    "bg",
    "ca",
    "zh",
    "hr",
    "cs",
    "da",
    "nl",
    "en",
    "et",
    "fi",
    "fr",
    "gl",
    "de",
    "el",
    "he",
    "hi",
    "hu",
    "is",
    "id",
    "it",
    "ja",
    "kn",
    "kk",
    "ko",
    "lv",
    "lt",
    "mk",
    "ms",
    "mr",
    "mi",
    "ne",
    "no",
    "fa",
    "pl",
    "pt",
    "ro",
    "ru",
    "sr",
    "sk",
    "sl",
    "es",
    "sw",
    "sv",
    "tl",
    "ta",
    "th",
    "tr",
    "uk",
    "ur",
    "vi",
    "cy",
  ];

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.openai.com/v1";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["stt"];
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
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return WhisperSTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return WhisperSTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("whisper");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.audioEmpty("whisper");
    }

    if (buffer.length > WhisperSTTHandler.MAX_FILE_SIZE) {
      throw new STTError({
        code: STT_ERROR_CODES.AUDIO_TOO_LONG,
        message: `Audio file exceeds maximum size of 25MB`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: {
          size: buffer.length,
          maxSize: WhisperSTTHandler.MAX_FILE_SIZE,
        },
        provider: "whisper",
      });
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "whisper");
    }

    const startTime = Date.now();
    const whisperOptions = options as WhisperSTTOptions;

    try {
      // Build form data
      const formData = new FormData();

      // Create a Blob from the buffer with appropriate mime type
      // Use Uint8Array view to ensure proper type compatibility
      const mimeType = this.getMimeType(options.format ?? "wav");
      const uint8View = new Uint8Array(buffer);
      const blob = new Blob([uint8View], { type: mimeType });
      formData.append("file", blob, `audio.${options.format ?? "wav"}`);

      // Model (required)
      formData.append("model", whisperOptions.model ?? "whisper-1");

      // Language (optional - if not provided, Whisper auto-detects)
      if (options.language) {
        // Convert language code to ISO-639-1 if needed (e.g., "en-US" -> "en")
        const langCode = options.language.split("-")[0]?.toLowerCase() ?? "en";
        formData.append("language", langCode);
      }

      // Response format - use verbose_json to get segments and timestamps
      const responseFormat = whisperOptions.responseFormat ?? "verbose_json";
      formData.append("response_format", responseFormat);

      // Temperature
      if (whisperOptions.temperature !== undefined) {
        formData.append("temperature", whisperOptions.temperature.toString());
      }

      // Prompt for guidance
      if (whisperOptions.prompt) {
        formData.append("prompt", whisperOptions.prompt);
      }

      // Enable word timestamps if requested
      if (options.wordTimestamps) {
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
      }

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => {
          // Fallback to empty object if JSON parsing fails
          return {};
        })) as {
          error?: { message?: string; type?: string };
        };
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Whisper STT failed: ${response.status} - ${errorData.error?.message ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
          context: { errorType: errorData.error?.type },
          provider: "whisper",
        });
      }

      const latency = Date.now() - startTime;

      // Parse response based on format
      if (responseFormat === "verbose_json") {
        const data = (await response.json()) as WhisperVerboseResponse;
        return this.mapVerboseResponse(data, latency, options);
      } else if (responseFormat === "json") {
        const data = (await response.json()) as WhisperSimpleResponse;
        return this.mapSimpleResponse(data, latency, options);
      } else {
        // Text, SRT, VTT formats
        const text = await response.text();
        return {
          text,
          language: options.language ?? "en",
          segments: [],
          duration: 0,
          confidence: 1,
          metadata: {
            latency,
            provider: "whisper",
            model: "whisper-1",
            format: responseFormat,
          },
        };
      }
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "whisper",
      );
    }
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case "mp3":
        return "audio/mpeg";
      case "mp4":
      case "m4a":
        return "audio/mp4";
      case "mpeg":
      case "mpga":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "webm":
        return "audio/webm";
      default:
        return "audio/wav";
    }
  }

  /**
   * Map verbose JSON response to STTResult
   */
  private mapVerboseResponse(
    data: WhisperVerboseResponse,
    latency: number,
    options: STTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = data.segments.map((seg) => {
      const segment: TranscriptionSegment = {
        text: seg.text.trim(),
        start: seg.start,
        end: seg.end,
        confidence: Math.exp(seg.avg_logprob), // Convert log probability to confidence
        isFinal: true,
      };

      // Add word-level details if available
      if (data.words && options.wordTimestamps) {
        // Filter words that fall within this segment
        segment.words = data.words
          .filter((w) => w.start >= seg.start && w.end <= seg.end)
          .map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: Math.exp(seg.avg_logprob), // Use segment confidence for words
          }));
      }

      return segment;
    });

    // Calculate overall confidence from segments
    const avgConfidence =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : 1;

    return {
      text: data.text,
      language: data.language,
      segments,
      duration: data.duration,
      confidence: avgConfidence,
      metadata: {
        latency,
        provider: "whisper",
        model: "whisper-1",
        task: data.task,
      },
    };
  }

  /**
   * Map simple JSON response to STTResult
   */
  private mapSimpleResponse(
    data: WhisperSimpleResponse,
    latency: number,
    options: STTOptions,
  ): STTResult {
    return {
      text: data.text,
      language: options.language ?? "en",
      segments: [
        {
          text: data.text,
          start: 0,
          end: 0,
          confidence: 1,
          isFinal: true,
        },
      ],
      duration: 0,
      confidence: 1,
      metadata: {
        latency,
        provider: "whisper",
        model: "whisper-1",
      },
    };
  }
}
