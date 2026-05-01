/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Implementation of STT using OpenAI's Whisper model.
 *
 * @module voice/providers/OpenAISTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  AudioFormat,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  WhisperSTTOptions,
  WhisperVerboseResponse,
} from "../../types/index.js";

/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Supports transcription and translation using OpenAI's Whisper model.
 *
 * @see https://platform.openai.com/docs/api-reference/audio
 */
export class OpenAISTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * Maximum audio duration in seconds (25 minutes)
   */
  public readonly maxAudioDuration = 25 * 60;

  /**
   * Whisper does not support streaming
   */
  public readonly supportsStreaming = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav", "ogg", "opus"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Whisper supports 100+ languages
    // Return the most common ones
    return [
      {
        code: "en",
        name: "English",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "es",
        name: "Spanish",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "fr",
        name: "French",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "de",
        name: "German",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "it",
        name: "Italian",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "pt",
        name: "Portuguese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ru",
        name: "Russian",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ja",
        name: "Japanese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ko",
        name: "Korean",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "zh",
        name: "Chinese",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "ar",
        name: "Arabic",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
      {
        code: "hi",
        name: "Hindi",
        supportsDiarization: false,
        supportsPunctuation: true,
      },
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("whisper");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("whisper");
    }

    const whisperOptions = options as WhisperSTTOptions;
    const startTime = Date.now();

    try {
      // Prepare form data
      const formData = new FormData();

      // Add audio file - convert Buffer to Uint8Array for compatibility
      const audioBlob = new Blob([new Uint8Array(audioBuffer)], {
        type: this.getMimeType(options.format ?? "wav"),
      });
      formData.append("file", audioBlob, `audio.${options.format ?? "wav"}`);

      // Add model
      formData.append("model", whisperOptions.model ?? "whisper-1");

      // Add optional parameters
      if (options.language) {
        formData.append("language", options.language);
      }

      if (whisperOptions.prompt) {
        formData.append("prompt", whisperOptions.prompt);
      }

      if (whisperOptions.temperature !== undefined) {
        formData.append("temperature", whisperOptions.temperature.toString());
      }

      // Request verbose_json for detailed response
      const responseFormat = whisperOptions.responseFormat ?? "verbose_json";
      formData.append("response_format", responseFormat);

      // Add timestamp granularities for word-level timestamps
      if (options.wordTimestamps && responseFormat === "verbose_json") {
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
      }

      // Choose endpoint based on translation option
      const endpoint = whisperOptions.translate
        ? `${this.baseUrl}/audio/translations`
        : `${this.baseUrl}/audio/transcriptions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw STTError.transcriptionFailed(
            "OpenAI STT request timed out after 30 seconds",
            "whisper",
            fetchErr,
          );
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
        throw STTError.transcriptionFailed(errorMessage, "whisper");
      }

      const latency = Date.now() - startTime;

      // Parse response based on format
      if (responseFormat === "text") {
        const text = await response.text();
        return {
          text,
          confidence: 0.95, // Whisper doesn't return confidence
          metadata: {
            latency,
            provider: "whisper",
            model: whisperOptions.model ?? "whisper-1",
          },
        };
      }

      const data = (await response.json()) as WhisperVerboseResponse;

      // Build result
      const result: STTResult = {
        text: data.text,
        confidence: 0.95, // Whisper doesn't return per-result confidence
        language: data.language,
        duration: data.duration,
        metadata: {
          latency,
          provider: "whisper",
          model: whisperOptions.model ?? "whisper-1",
          task: data.task,
        },
      };

      // Add word timings if available
      if (data.words && data.words.length > 0) {
        result.words = data.words.map((word) => ({
          word: word.word,
          startTime: word.start,
          endTime: word.end,
        }));
      }

      // Add segments
      if (data.segments && data.segments.length > 0) {
        result.segments = data.segments.map((segment, index) => ({
          index,
          text: segment.text,
          isFinal: true,
          confidence: Math.exp(segment.avg_logprob), // Convert log prob to confidence
          startTime: segment.start,
          endTime: segment.end,
        }));
      }

      logger.info(
        `[WhisperSTTHandler] Transcribed ${data.duration?.toFixed(1) ?? "?"}s audio in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[WhisperSTTHandler] Transcription failed: ${errorMessage}`);
      throw STTError.transcriptionFailed(
        errorMessage,
        "whisper",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: AudioFormat): string {
    const mimeTypes: Partial<Record<AudioFormat, string>> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/opus",
    };
    return mimeTypes[format] ?? "audio/wav";
  }
}

// Export as named exports for compatibility
export { OpenAISTT as WhisperSTT };
export { OpenAISTT as WhisperSTTHandler };
export { OpenAISTT as OpenAISTTHandler };
