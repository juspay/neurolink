/**
 * Google Cloud Speech-to-Text Handler
 *
 * Handler for Google Cloud Speech-to-Text API integration.
 * Provides high-quality transcription with multiple models and streaming support.
 *
 * @module adapters/stt/googleSTTHandler
 * @see https://cloud.google.com/speech-to-text/docs
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
 * Google Cloud STT model options
 */
export type GoogleSTTModel =
  | "latest_short" // Best for short audio < 1 minute
  | "latest_long" // Best for long audio >= 1 minute
  | "telephony" // Optimized for telephony audio (8kHz)
  | "medical_conversation" // Medical conversations
  | "medical_dictation" // Medical dictation
  | "command_and_search" // Short commands and search queries
  | "phone_call" // Phone call transcription
  | "video" // Video transcription
  | "default"; // Default model

/**
 * Google Cloud audio encoding options
 */
export type GoogleAudioEncoding =
  | "ENCODING_UNSPECIFIED"
  | "LINEAR16"
  | "FLAC"
  | "MULAW"
  | "AMR"
  | "AMR_WB"
  | "OGG_OPUS"
  | "SPEEX_WITH_HEADER_BYTE"
  | "MP3"
  | "WEBM_OPUS";

/**
 * Google Cloud STT-specific options
 */
export type GoogleSTTOptions = STTOptions & {
  /** Speech recognition model */
  model?: GoogleSTTModel;
  /** Audio encoding format */
  encoding?: GoogleAudioEncoding;
  /** Sample rate in Hertz */
  sampleRateHertz?: number;
  /** Number of audio channels */
  audioChannelCount?: number;
  /** Enable separate recognition per channel */
  enableSeparateRecognitionPerChannel?: boolean;
  /** Alternative languages to recognize */
  alternativeLanguageCodes?: string[];
  /** Maximum alternatives to return */
  maxAlternatives?: number;
  /** Enable automatic punctuation */
  enableAutomaticPunctuation?: boolean;
  /** Enable spoken punctuation */
  enableSpokenPunctuation?: boolean;
  /** Enable spoken emojis */
  enableSpokenEmojis?: boolean;
  /** Phrases to boost recognition */
  speechContexts?: Array<{
    phrases: string[];
    boost?: number;
  }>;
  /** Adaptation configuration */
  adaptation?: {
    phraseSets?: string[];
    customClasses?: string[];
  };
  /** Use enhanced model (more accurate but slower) */
  useEnhanced?: boolean;
};

/**
 * Google Cloud STT API response types
 */
type GoogleWordInfo = {
  startTime: string; // Duration format "1.500s"
  endTime: string;
  word: string;
  confidence?: number;
  speakerTag?: number;
};

type GoogleSpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
  words?: GoogleWordInfo[];
};

type GoogleSpeechRecognitionResult = {
  alternatives: GoogleSpeechRecognitionAlternative[];
  channelTag?: number;
  languageCode?: string;
};

type GoogleLongRunningRecognizeResponse = {
  results: GoogleSpeechRecognitionResult[];
  totalBilledTime?: string;
};

type GoogleRecognizeResponse = {
  results: GoogleSpeechRecognitionResult[];
  totalBilledTime?: string;
};

type GoogleOperationResponse = {
  name: string;
  done: boolean;
  metadata?: {
    progressPercent?: number;
    startTime?: string;
    lastUpdateTime?: string;
  };
  response?: GoogleLongRunningRecognizeResponse;
  error?: {
    code: number;
    message: string;
  };
};

/**
 * Google Cloud Speech-to-Text Handler
 *
 * Supports both synchronous (short audio) and asynchronous (long audio) transcription.
 *
 * @example
 * ```typescript
 * const handler = new GoogleSTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en-US",
 *   model: "latest_long",
 *   diarization: true,
 *   wordTimestamps: true,
 * });
 * ```
 */
export class GoogleSTTHandler implements STTProvider {
  readonly name = "google-stt";
  private readonly apiKey: string | null;
  private readonly projectId: string | null;
  private readonly baseUrl: string;

  /**
   * Maximum audio duration for synchronous recognition (60 seconds)
   */
  private static readonly SYNC_MAX_DURATION_SECONDS = 60;

  /**
   * Supported audio formats
   */
  private static readonly SUPPORTED_FORMATS = [
    "wav",
    "mp3",
    "flac",
    "ogg",
    "webm",
  ];

  /**
   * Supported languages (subset - Google supports 125+ languages)
   */
  private static readonly SUPPORTED_LANGUAGES = [
    "en-US",
    "en-GB",
    "en-AU",
    "en-IN",
    "es-ES",
    "es-MX",
    "fr-FR",
    "fr-CA",
    "de-DE",
    "it-IT",
    "pt-BR",
    "pt-PT",
    "nl-NL",
    "hi-IN",
    "ja-JP",
    "ko-KR",
    "zh-CN",
    "zh-TW",
    "ru-RU",
    "pl-PL",
    "tr-TR",
    "uk-UA",
    "vi-VN",
    "id-ID",
    "th-TH",
    "ar-SA",
    "ar-EG",
    "he-IL",
    "sv-SE",
    "da-DK",
    "nb-NO",
    "fi-FI",
    "cs-CZ",
    "ro-RO",
    "hu-HU",
    "el-GR",
    "sk-SK",
    "bg-BG",
    "hr-HR",
    "sl-SI",
    "et-EE",
    "lv-LV",
    "lt-LT",
    "ms-MY",
    "ta-IN",
    "te-IN",
    "bn-IN",
    "gu-IN",
    "kn-IN",
    "ml-IN",
    "mr-IN",
    "pa-IN",
  ];

  /**
   * Maximum polling attempts for long-running operations
   */
  private static readonly MAX_POLL_ATTEMPTS = 180;

  /**
   * Polling interval in milliseconds
   */
  private static readonly POLL_INTERVAL_MS = 5000;

  constructor(apiKey?: string, projectId?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.GOOGLE_CLOUD_API_KEY ?? null;
    this.projectId = projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? null;
    this.baseUrl = baseUrl ?? "https://speech.googleapis.com/v1";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["stt", "streaming"];
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
    const errors: string[] = [];
    if (!this.apiKey) {
      errors.push("GOOGLE_CLOUD_API_KEY not configured");
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return GoogleSTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return GoogleSTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.notConfigured("google-stt");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.emptyAudio("google-stt");
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "google-stt");
    }

    const startTime = Date.now();
    const googleOptions = options as GoogleSTTOptions;

    // Estimate audio duration to decide sync vs async
    const estimatedDuration = this.estimateAudioDuration(buffer, googleOptions);
    const useAsyncRecognition =
      estimatedDuration > GoogleSTTHandler.SYNC_MAX_DURATION_SECONDS;

    try {
      if (useAsyncRecognition) {
        return await this.recognizeLongRunning(
          buffer,
          googleOptions,
          startTime,
        );
      } else {
        return await this.recognizeSync(buffer, googleOptions, startTime);
      }
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "google-stt",
      );
    }
  }

  /**
   * Synchronous recognition for short audio
   */
  private async recognizeSync(
    buffer: Buffer,
    options: GoogleSTTOptions,
    startTime: number,
  ): Promise<STTResult> {
    const requestBody = this.buildRecognizeRequest(buffer, options);

    const response = await fetch(
      `${this.baseUrl}/speech:recognize?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Google STT failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "google-stt",
      });
    }

    const data = (await response.json()) as GoogleRecognizeResponse;
    const latency = Date.now() - startTime;

    return this.mapToSTTResult(data, latency, options);
  }

  /**
   * Long-running recognition for long audio
   */
  private async recognizeLongRunning(
    buffer: Buffer,
    options: GoogleSTTOptions,
    startTime: number,
  ): Promise<STTResult> {
    const requestBody = this.buildRecognizeRequest(buffer, options);

    // Start long-running operation
    const response = await fetch(
      `${this.baseUrl}/speech:longrunningrecognize?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Google STT long-running start failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "google-stt",
      });
    }

    const operation = (await response.json()) as GoogleOperationResponse;

    // Poll for results
    const result = await this.pollForResults(operation.name);
    const latency = Date.now() - startTime;

    if (!result.response) {
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: "Google STT returned no response",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        provider: "google-stt",
      });
    }

    return this.mapToSTTResult(result.response, latency, options);
  }

  /**
   * Build recognition request body
   */
  private buildRecognizeRequest(
    buffer: Buffer,
    options: GoogleSTTOptions,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      languageCode: options.language ?? "en-US",
    };

    // Model
    if (options.model) {
      config.model = options.model;
    }

    // Encoding
    config.encoding = options.encoding ?? this.inferEncoding(options.format);

    // Sample rate
    if (options.sampleRateHertz) {
      config.sampleRateHertz = options.sampleRateHertz;
    }

    // Audio channels
    if (options.audioChannelCount) {
      config.audioChannelCount = options.audioChannelCount;
      if (options.enableSeparateRecognitionPerChannel) {
        config.enableSeparateRecognitionPerChannel = true;
      }
    }

    // Word timestamps
    if (options.wordTimestamps !== false) {
      config.enableWordTimeOffsets = true;
      config.enableWordConfidence = true;
    }

    // Diarization
    if (options.diarization) {
      config.diarizationConfig = {
        enableSpeakerDiarization: true,
        minSpeakerCount: 2,
        maxSpeakerCount: options.speakerCount ?? 6,
      };
    }

    // Automatic punctuation
    if (options.punctuate !== false || options.enableAutomaticPunctuation) {
      config.enableAutomaticPunctuation = true;
    }

    // Spoken punctuation and emojis
    if (options.enableSpokenPunctuation) {
      config.enableSpokenPunctuation = true;
    }
    if (options.enableSpokenEmojis) {
      config.enableSpokenEmojis = true;
    }

    // Alternative languages
    if (
      options.alternativeLanguageCodes &&
      options.alternativeLanguageCodes.length > 0
    ) {
      config.alternativeLanguageCodes = options.alternativeLanguageCodes;
    }

    // Max alternatives
    if (options.maxAlternatives) {
      config.maxAlternatives = options.maxAlternatives;
    }

    // Profanity filter
    if (options.profanityFilter) {
      config.profanityFilter = true;
    }

    // Speech contexts (phrase hints)
    if (options.speechContexts && options.speechContexts.length > 0) {
      config.speechContexts = options.speechContexts;
    } else if (options.keywords && options.keywords.length > 0) {
      config.speechContexts = [{ phrases: options.keywords }];
    }

    // Enhanced model
    if (options.useEnhanced) {
      config.useEnhanced = true;
    }

    return {
      config,
      audio: {
        content: buffer.toString("base64"),
      },
    };
  }

  /**
   * Infer audio encoding from format
   */
  private inferEncoding(format?: string): GoogleAudioEncoding {
    switch (format?.toLowerCase()) {
      case "wav":
        return "LINEAR16";
      case "flac":
        return "FLAC";
      case "mp3":
        return "MP3";
      case "ogg":
        return "OGG_OPUS";
      case "webm":
        return "WEBM_OPUS";
      default:
        return "ENCODING_UNSPECIFIED";
    }
  }

  /**
   * Estimate audio duration from buffer size
   */
  private estimateAudioDuration(
    buffer: Buffer,
    options: GoogleSTTOptions,
  ): number {
    // Rough estimation based on typical audio bitrates
    const bytesPerSecond = 16000; // Assume 16kHz mono 16-bit
    const sampleRate = options.sampleRateHertz ?? 16000;
    const adjustedBytesPerSecond = (bytesPerSecond * sampleRate) / 16000;
    return buffer.length / adjustedBytesPerSecond;
  }

  /**
   * Poll for long-running operation results
   */
  private async pollForResults(
    operationName: string,
  ): Promise<GoogleOperationResponse> {
    for (let i = 0; i < GoogleSTTHandler.MAX_POLL_ATTEMPTS; i++) {
      const response = await fetch(
        `https://speech.googleapis.com/v1/operations/${operationName}?key=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Google STT operation poll failed: ${response.status}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
          provider: "google-stt",
        });
      }

      const result = (await response.json()) as GoogleOperationResponse;

      if (result.done) {
        if (result.error) {
          throw new STTError({
            code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
            message: `Google STT error: ${result.error.message}`,
            category: ErrorCategory.EXECUTION,
            severity: ErrorSeverity.HIGH,
            retriable: false,
            context: { errorCode: result.error.code },
            provider: "google-stt",
          });
        }
        return result;
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, GoogleSTTHandler.POLL_INTERVAL_MS),
      );
    }

    throw new STTError({
      code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
      message: "Google STT transcription timed out",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      provider: "google-stt",
    });
  }

  /**
   * Parse Google duration string to seconds
   */
  private parseDuration(duration: string): number {
    // Duration format: "1.500s"
    const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
    return match ? parseFloat(match[1]!) : 0;
  }

  /**
   * Map Google response to STTResult
   */
  private mapToSTTResult(
    data: GoogleRecognizeResponse | GoogleLongRunningRecognizeResponse,
    latency: number,
    options: GoogleSTTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = [];
    let fullText = "";
    let totalConfidence = 0;
    let resultCount = 0;
    const speakers = new Set<number>();

    for (const result of data.results ?? []) {
      const alternative = result.alternatives[0];
      if (!alternative) {
        continue;
      }

      fullText += (fullText ? " " : "") + alternative.transcript;
      totalConfidence += alternative.confidence ?? 0.9;
      resultCount++;

      // Build segment from words
      if (alternative.words && alternative.words.length > 0) {
        const segment: TranscriptionSegment = {
          text: alternative.transcript,
          start: this.parseDuration(alternative.words[0]!.startTime),
          end: this.parseDuration(
            alternative.words[alternative.words.length - 1]!.endTime,
          ),
          confidence: alternative.confidence ?? 0.9,
          words: alternative.words.map((w) => {
            if (w.speakerTag !== undefined) {
              speakers.add(w.speakerTag);
            }
            return {
              word: w.word,
              start: this.parseDuration(w.startTime),
              end: this.parseDuration(w.endTime),
              confidence: w.confidence ?? alternative.confidence ?? 0.9,
              speaker:
                w.speakerTag !== undefined
                  ? `speaker_${w.speakerTag}`
                  : undefined,
            };
          }),
          isFinal: true,
        };

        // Set speaker for segment if all words have same speaker
        const uniqueSpeakers = new Set(
          alternative.words
            .filter((w) => w.speakerTag !== undefined)
            .map((w) => w.speakerTag),
        );
        if (uniqueSpeakers.size === 1) {
          segment.speaker = `speaker_${[...uniqueSpeakers][0]}`;
        }

        segments.push(segment);
      } else {
        // No word-level timestamps
        segments.push({
          text: alternative.transcript,
          start: 0,
          end: 0,
          confidence: alternative.confidence ?? 0.9,
          isFinal: true,
        });
      }
    }

    // Calculate total duration from segments
    let duration = 0;
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1]!;
      duration = lastSegment.end;
    }

    return {
      text: fullText,
      language: options.language ?? "en-US",
      segments,
      duration,
      confidence: resultCount > 0 ? totalConfidence / resultCount : 0.9,
      metadata: {
        latency,
        provider: "google-stt",
        model: options.model ?? "default",
        speakerCount: speakers.size > 0 ? speakers.size : undefined,
        billedTime: data.totalBilledTime,
      },
    };
  }
}
