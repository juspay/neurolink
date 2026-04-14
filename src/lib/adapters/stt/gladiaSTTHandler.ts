/**
 * Gladia Speech-to-Text Handler
 *
 * Handler for Gladia STT API integration with streaming support.
 * Gladia provides high-quality transcription with diarization and
 * real-time streaming capabilities.
 *
 * @module adapters/stt/gladiaSTTHandler
 * @see https://docs.gladia.io/
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
 * Gladia-specific STT options
 */
export type GladiaSTTOptions = STTOptions & {
  /** Enable automatic language detection */
  detectLanguage?: boolean;
  /** Enable word-level timestamps */
  wordTimestamps?: boolean;
  /** Custom vocabulary (terms to boost) */
  customVocabulary?: string[];
  /** Enable translation to target language */
  translationLanguage?: string;
  /** Enable summarization */
  summarize?: boolean;
  /** Audio quality: low, medium, high */
  quality?: "low" | "medium" | "high";
  /** Enable audio noise reduction */
  noiseReduction?: boolean;
};

/**
 * Gladia API response types
 */
type GladiaWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
};

type GladiaUtterance = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  words: GladiaWord[];
  language?: string;
};

type GladiaTranscriptionResult = {
  transcription: {
    full_transcript: string;
    utterances: GladiaUtterance[];
    languages?: string[];
  };
  metadata?: {
    audio_duration: number;
    transcription_time: number;
    number_of_speakers?: number;
  };
  summary?: string;
  translation?: {
    full_transcript: string;
    utterances: GladiaUtterance[];
  };
};

type GladiaUploadResponse = {
  audio_url: string;
  audio_metadata?: {
    id: string;
    filename?: string;
    extension?: string;
    size?: number;
    duration?: number;
    nb_channels?: number;
    sample_rate?: number;
  };
};

type GladiaTranscriptionResponse = {
  id: string;
  result_url: string;
  status?: string;
};

type GladiaResultResponse = {
  status: "queued" | "processing" | "done" | "error";
  result?: GladiaTranscriptionResult;
  error?: {
    message: string;
    code: string;
  };
};

/**
 * Gladia Speech-to-Text Handler
 *
 * Supports both file upload transcription and real-time streaming.
 *
 * @example
 * ```typescript
 * const handler = new GladiaSTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en",
 *   diarization: true,
 *   wordTimestamps: true,
 * });
 * ```
 */
export class GladiaSTTHandler implements STTProvider {
  readonly name = "gladia";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  /**
   * Supported audio formats
   */
  private static readonly SUPPORTED_FORMATS = [
    "wav",
    "mp3",
    "m4a",
    "flac",
    "ogg",
    "webm",
    "mp4",
  ];

  /**
   * Supported languages (subset - Gladia supports 90+ languages)
   */
  private static readonly SUPPORTED_LANGUAGES = [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "pl",
    "ru",
    "ja",
    "zh",
    "ko",
    "ar",
    "hi",
    "tr",
    "vi",
    "th",
    "id",
    "ms",
    "sv",
    "da",
    "no",
    "fi",
    "cs",
    "sk",
    "ro",
    "hu",
    "el",
    "he",
    "uk",
    "bg",
    "hr",
    "sr",
    "sl",
    "et",
    "lv",
    "lt",
  ];

  /**
   * Maximum polling attempts for transcription results
   */
  private static readonly MAX_POLL_ATTEMPTS = 60;

  /**
   * Polling interval in milliseconds
   */
  private static readonly POLL_INTERVAL_MS = 2000;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.GLADIA_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.gladia.io/v2";
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
    if (!this.apiKey) {
      return { valid: false, errors: ["GLADIA_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return GladiaSTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return GladiaSTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("gladia");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.audioEmpty("gladia");
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "gladia");
    }

    const startTime = Date.now();
    const gladiaOptions = options as GladiaSTTOptions;

    try {
      // Step 1: Upload audio file
      const uploadResponse = await this.uploadAudio(buffer, options.format);

      // Step 2: Start transcription
      const transcriptionResponse = await this.startTranscription(
        uploadResponse.audio_url,
        gladiaOptions,
      );

      // Step 3: Poll for results
      const result = await this.pollForResults(
        transcriptionResponse.result_url,
      );

      const latency = Date.now() - startTime;

      if (!result.result) {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: "Gladia returned no transcription result",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          provider: "gladia",
        });
      }

      return this.mapToSTTResult(result.result, latency, gladiaOptions);
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "gladia",
      );
    }
  }

  /**
   * Stream transcription (real-time audio input)
   *
   * Gladia supports WebSocket-based real-time transcription.
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("gladia");
    }

    const gladiaOptions = options as GladiaSTTOptions;

    // Build WebSocket URL with configuration
    const wsUrl = `wss://api.gladia.io/audio/text/audio-transcription`;

    // Queue for segments received from WebSocket
    const segments: TranscriptionSegment[] = [];
    let resolveNext: ((value: TranscriptionSegment | null) => void) | null =
      null;

    // State management
    const state = {
      closed: false,
      errorMessage: null as string | null,
    };

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl, {
      // @ts-expect-error - headers are supported by Node.js WebSocket libraries
      headers: {
        "x-gladia-key": this.apiKey,
      },
    });

    // Handle incoming transcription results
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : event.data.toString(),
        ) as {
          type?: string;
          transcription?: {
            text: string;
            confidence?: number;
            start?: number;
            end?: number;
            is_final?: boolean;
            speaker?: number;
          };
          error?: string;
        };

        if (data.error) {
          state.errorMessage = data.error;
          state.closed = true;
          if (resolveNext) {
            resolveNext(null);
            resolveNext = null;
          }
          return;
        }

        if (data.transcription && data.transcription.text) {
          const segment: TranscriptionSegment = {
            text: data.transcription.text,
            start: data.transcription.start ?? 0,
            end: data.transcription.end ?? 0,
            confidence: data.transcription.confidence ?? 0.9,
            isFinal: data.transcription.is_final ?? false,
            speaker:
              data.transcription.speaker !== undefined
                ? `speaker_${data.transcription.speaker}`
                : undefined,
          };

          if (resolveNext) {
            resolveNext(segment);
            resolveNext = null;
          } else {
            segments.push(segment);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      state.closed = true;
      if (resolveNext) {
        resolveNext(null);
        resolveNext = null;
      }
    };

    ws.onerror = (event: Event) => {
      state.errorMessage = `WebSocket error: ${(event as ErrorEvent).message ?? "Unknown error"}`;
      state.closed = true;
      if (resolveNext) {
        resolveNext(null);
        resolveNext = null;
      }
    };

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(
          new STTError({
            code: STT_ERROR_CODES.STREAMING_NOT_SUPPORTED,
            message: "WebSocket connection timeout",
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            retriable: true,
            provider: "gladia",
          }),
        );
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);

        // Send configuration message
        const configMessage = {
          x_gladia_key: this.apiKey,
          encoding: "wav",
          sample_rate: 16000,
          language: gladiaOptions.language ?? "en",
          diarization: gladiaOptions.diarization ?? false,
          word_timestamps: gladiaOptions.wordTimestamps ?? false,
        };
        ws.send(JSON.stringify(configMessage));

        resolve();
      };
    });

    // Start sending audio in background
    const sendAudio = async () => {
      try {
        for await (const chunk of audioStream) {
          if (ws.readyState === WebSocket.OPEN) {
            // Send audio as base64
            ws.send(
              JSON.stringify({
                frames: chunk.toString("base64"),
              }),
            );
          }
        }
        // Signal end of audio
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ eof: 1 }));
        }
      } catch {
        ws.close();
      }
    };

    // Start sending audio (don't await)
    void sendAudio();

    // Yield segments as they arrive
    while (!state.closed || segments.length > 0) {
      if (state.errorMessage) {
        throw new STTError({
          code: STT_ERROR_CODES.STREAMING_NOT_SUPPORTED,
          message: state.errorMessage,
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          retriable: true,
          provider: "gladia",
        });
      }

      if (segments.length > 0) {
        yield segments.shift()!;
      } else if (!state.closed) {
        const segment = await new Promise<TranscriptionSegment | null>(
          (resolve) => {
            resolveNext = resolve;
          },
        );
        if (segment === null) {
          break;
        }
        yield segment;
      }
    }

    // Cleanup
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  /**
   * Upload audio file to Gladia
   */
  private async uploadAudio(
    buffer: Buffer,
    format?: string,
  ): Promise<GladiaUploadResponse> {
    const formData = new FormData();

    // Create blob with proper mime type
    const mimeType = this.getMimeType(format ?? "wav");
    const uint8View = new Uint8Array(buffer);
    const blob = new Blob([uint8View], { type: mimeType });
    formData.append("audio", blob, `audio.${format ?? "wav"}`);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers: {
        "x-gladia-key": this.apiKey!,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Gladia upload failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "gladia",
      });
    }

    return (await response.json()) as GladiaUploadResponse;
  }

  /**
   * Start transcription job
   */
  private async startTranscription(
    audioUrl: string,
    options: GladiaSTTOptions,
  ): Promise<GladiaTranscriptionResponse> {
    const requestBody: Record<string, unknown> = {
      audio_url: audioUrl,
    };

    // Add options
    if (options.language) {
      requestBody.language = options.language.split("-")[0]; // Use base language code
    } else if (options.detectLanguage !== false) {
      requestBody.detect_language = true;
    }

    if (options.diarization) {
      requestBody.diarization = true;
      if (options.speakerCount) {
        requestBody.diarization_config = {
          number_of_speakers: options.speakerCount,
        };
      }
    }

    if (options.wordTimestamps !== false) {
      requestBody.enable_word_timecodes = true;
    }

    if (options.punctuate !== false) {
      requestBody.punctuate = true;
    }

    if (options.customVocabulary && options.customVocabulary.length > 0) {
      requestBody.custom_vocabulary = options.customVocabulary;
    }

    if (options.translationLanguage) {
      requestBody.translation = true;
      requestBody.translation_config = {
        target_languages: [options.translationLanguage],
      };
    }

    if (options.summarize) {
      requestBody.summarization = true;
    }

    const response = await fetch(`${this.baseUrl}/transcription`, {
      method: "POST",
      headers: {
        "x-gladia-key": this.apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Gladia transcription start failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "gladia",
      });
    }

    return (await response.json()) as GladiaTranscriptionResponse;
  }

  /**
   * Poll for transcription results
   */
  private async pollForResults(
    resultUrl: string,
  ): Promise<GladiaResultResponse> {
    for (let i = 0; i < GladiaSTTHandler.MAX_POLL_ATTEMPTS; i++) {
      const response = await fetch(resultUrl, {
        headers: {
          "x-gladia-key": this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Gladia result fetch failed: ${response.status}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
          provider: "gladia",
        });
      }

      const result = (await response.json()) as GladiaResultResponse;

      if (result.status === "done") {
        return result;
      }

      if (result.status === "error") {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Gladia transcription error: ${result.error?.message ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { errorCode: result.error?.code },
          provider: "gladia",
        });
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, GladiaSTTHandler.POLL_INTERVAL_MS),
      );
    }

    throw new STTError({
      code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
      message: "Gladia transcription timed out",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      provider: "gladia",
    });
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case "wav":
        return "audio/wav";
      case "mp3":
        return "audio/mpeg";
      case "m4a":
        return "audio/mp4";
      case "flac":
        return "audio/flac";
      case "ogg":
        return "audio/ogg";
      case "webm":
        return "audio/webm";
      default:
        return "audio/wav";
    }
  }

  /**
   * Map Gladia response to STTResult
   */
  private mapToSTTResult(
    data: GladiaTranscriptionResult,
    latency: number,
    options: GladiaSTTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = data.transcription.utterances.map(
      (utterance) => ({
        text: utterance.text,
        start: utterance.start,
        end: utterance.end,
        confidence: utterance.confidence,
        speaker:
          utterance.speaker !== undefined
            ? `speaker_${utterance.speaker}`
            : undefined,
        words: utterance.words.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker !== undefined ? `speaker_${w.speaker}` : undefined,
        })),
        isFinal: true,
      }),
    );

    // Calculate overall confidence
    const avgConfidence =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : 1;

    // Determine detected language
    const detectedLanguage =
      data.transcription.languages?.[0] ?? options.language ?? "en";

    return {
      text: data.transcription.full_transcript,
      language: detectedLanguage,
      segments,
      duration: data.metadata?.audio_duration ?? 0,
      confidence: avgConfidence,
      metadata: {
        latency,
        provider: "gladia",
        model: "gladia-v2",
        speakerCount: data.metadata?.number_of_speakers,
        transcriptionTime: data.metadata?.transcription_time,
        summary: data.summary,
        translation: data.translation
          ? {
              text: data.translation.full_transcript,
              language: options.translationLanguage,
            }
          : undefined,
      },
    };
  }
}
