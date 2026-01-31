/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Implementation of STT using OpenAI's Whisper model.
 *
 * @module voice/providers/OpenAISTT
 */

import type { STTHandler } from "../STTProvider.js";
import type {
  STTOptions,
  STTResult,
  STTLanguage,
  AudioFormat,
  WordTiming,
} from "../types/voiceTypes.js";
import { STTError } from "../errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Whisper model options
 */
export type WhisperModel = "whisper-1";

/**
 * Whisper-specific STT options
 */
export type WhisperSTTOptions = STTOptions & {
  /** Model to use */
  model?: WhisperModel;
  /** Prompt to guide transcription */
  prompt?: string;
  /** Output format (json, text, srt, verbose_json, vtt) */
  responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  /** Translate to English instead of transcribe */
  translate?: boolean;
  /** Temperature for sampling (0-1) */
  temperature?: number;
};

/**
 * Whisper API response types
 */
type WhisperTranscriptionWord = {
  word: string;
  start: number;
  end: number;
};

type WhisperTranscriptionSegment = {
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
};

type WhisperVerboseResponse = {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: WhisperTranscriptionWord[];
  segments?: WhisperTranscriptionSegment[];
};

/**
 * OpenAI Whisper Speech-to-Text Handler
 *
 * Supports transcription and translation using OpenAI's Whisper model.
 *
 * @see https://platform.openai.com/docs/api-reference/audio
 */
export class WhisperSTTHandler implements STTHandler {
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
      { code: "en", name: "English", supportsDiarization: false, supportsPunctuation: true },
      { code: "es", name: "Spanish", supportsDiarization: false, supportsPunctuation: true },
      { code: "fr", name: "French", supportsDiarization: false, supportsPunctuation: true },
      { code: "de", name: "German", supportsDiarization: false, supportsPunctuation: true },
      { code: "it", name: "Italian", supportsDiarization: false, supportsPunctuation: true },
      { code: "pt", name: "Portuguese", supportsDiarization: false, supportsPunctuation: true },
      { code: "ru", name: "Russian", supportsDiarization: false, supportsPunctuation: true },
      { code: "ja", name: "Japanese", supportsDiarization: false, supportsPunctuation: true },
      { code: "ko", name: "Korean", supportsDiarization: false, supportsPunctuation: true },
      { code: "zh", name: "Chinese", supportsDiarization: false, supportsPunctuation: true },
      { code: "ar", name: "Arabic", supportsDiarization: false, supportsPunctuation: true },
      { code: "hi", name: "Hindi", supportsDiarization: false, supportsPunctuation: true },
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

      // Add audio file
      const audioBlob = new Blob([audioBuffer], {
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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
    const mimeTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/opus",
    };
    return mimeTypes[format] ?? "audio/wav";
  }
}

// Export as named export for compatibility
export { WhisperSTTHandler as OpenAISTTHandler };
