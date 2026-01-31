/**
 * Deepgram Speech-to-Text Handler
 *
 * Handler for Deepgram Nova-3 STT API integration with streaming support.
 *
 * @module adapters/stt/deepgramSTTHandler
 * @see https://developers.deepgram.com/docs/getting-started-with-pre-recorded-audio
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
 * Deepgram-specific STT options
 */
export type DeepgramSTTOptions = STTOptions & {
  /** Deepgram model: nova-3 (default), nova-2, enhanced, base */
  model?: "nova-3" | "nova-2" | "enhanced" | "base";
  /** Enable smart formatting (dates, times, currency) */
  smartFormat?: boolean;
  /** Custom vocabulary (terms/phrases to boost) */
  search?: string[];
  /** Replace specific words */
  replace?: Array<{ find: string; replace: string }>;
  /** Enable utterance detection */
  utterances?: boolean;
  /** Utterance split threshold (0-1) */
  utterSplit?: number;
  /** Enable filler words (um, uh) detection */
  fillerWords?: boolean;
  /** Topic detection */
  detectTopics?: boolean;
  /** Entity detection */
  detectEntities?: boolean;
  /** Summarization */
  summarize?: boolean;
};

/**
 * Deepgram API response types
 */
type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  punctuated_word?: string;
};

type DeepgramAlternative = {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
};

type DeepgramChannel = {
  alternatives: DeepgramAlternative[];
};

type DeepgramUtterance = {
  start: number;
  end: number;
  confidence: number;
  channel: number;
  transcript: string;
  words: DeepgramWord[];
  speaker?: number;
};

type DeepgramResponse = {
  metadata: {
    request_id: string;
    transaction_key?: string;
    sha256?: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info?: Record<string, { name: string; version: string }>;
  };
  results: {
    channels: DeepgramChannel[];
    utterances?: DeepgramUtterance[];
  };
};

/**
 * Deepgram Speech-to-Text Handler
 *
 * Supports Nova-3 model with streaming, diarization, and advanced features.
 *
 * @example
 * ```typescript
 * const handler = new DeepgramSTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en-US",
 *   model: "nova-3",
 *   diarization: true,
 *   punctuate: true,
 * });
 * ```
 */
export class DeepgramSTTHandler implements STTProvider {
  readonly name = "deepgram";
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
    "mpeg",
    "mpga",
  ];

  /**
   * Supported languages (subset - Deepgram supports 30+ languages)
   */
  private static readonly SUPPORTED_LANGUAGES = [
    "en",
    "en-US",
    "en-GB",
    "en-AU",
    "en-IN",
    "es",
    "es-ES",
    "es-419",
    "fr",
    "fr-FR",
    "fr-CA",
    "de",
    "de-DE",
    "it",
    "it-IT",
    "pt",
    "pt-BR",
    "pt-PT",
    "nl",
    "nl-NL",
    "ja",
    "ja-JP",
    "zh",
    "zh-CN",
    "zh-TW",
    "ko",
    "ko-KR",
    "hi",
    "hi-IN",
    "ru",
    "ru-RU",
    "pl",
    "pl-PL",
    "uk",
    "uk-UA",
    "tr",
    "tr-TR",
    "sv",
    "sv-SE",
    "da",
    "da-DK",
    "no",
    "no-NO",
    "fi",
    "fi-FI",
  ];

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.DEEPGRAM_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.deepgram.com/v1";
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
      return { valid: false, errors: ["DEEPGRAM_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return DeepgramSTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return DeepgramSTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.notConfigured("deepgram");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.emptyAudio("deepgram");
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "deepgram");
    }

    const startTime = Date.now();
    const deepgramOptions = options as DeepgramSTTOptions;

    try {
      // Build query parameters
      const queryParams = this.buildQueryParams(deepgramOptions);
      const url = `${this.baseUrl}/listen?${queryParams.toString()}`;

      // Determine content type
      const contentType = this.getContentType(options.format);

      // Create a Blob for fetch compatibility
      // Use Uint8Array view to ensure proper type compatibility
      const uint8View = new Uint8Array(buffer);
      const blob = new Blob([uint8View], { type: contentType });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": contentType,
        },
        body: blob,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => {
          // Fallback to empty object if JSON parsing fails
          return {};
        })) as {
          err_code?: string;
          err_msg?: string;
        };
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `Deepgram STT failed: ${response.status} - ${errorData.err_msg ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
          context: { errorCode: errorData.err_code },
          provider: "deepgram",
        });
      }

      const data = (await response.json()) as DeepgramResponse;
      const latency = Date.now() - startTime;

      return this.mapToSTTResult(data, latency, deepgramOptions);
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "deepgram",
      );
    }
  }

  /**
   * Stream transcription (live audio input)
   *
   * Provides real-time transcription using WebSocket connection to Deepgram's
   * streaming API. Yields TranscriptionSegment objects as audio is processed.
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) {
      throw STTError.notConfigured("deepgram");
    }

    const deepgramOptions = options as DeepgramSTTOptions;
    const queryParams = this.buildQueryParams(deepgramOptions);
    queryParams.set("encoding", "linear16");
    queryParams.set("sample_rate", "16000");
    queryParams.set("interim_results", "true");

    const wsUrl = `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`;

    // Queue for segments received from WebSocket
    const segments: TranscriptionSegment[] = [];
    let resolveNext: ((value: TranscriptionSegment | null) => void) | null =
      null;

    // Use state object to avoid TypeScript narrowing issues with closures
    const state = {
      closed: false,
      errorMessage: null as string | null,
    };

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl, {
      // @ts-expect-error - headers are supported by Node.js WebSocket libraries
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    // Handle incoming transcription results
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : event.data.toString(),
        ) as {
          channel?: {
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
            }>;
          };
          start?: number;
          duration?: number;
          is_final?: boolean;
          speech_final?: boolean;
        };

        if (data.channel?.alternatives?.[0]?.transcript) {
          const segment: TranscriptionSegment = {
            text: data.channel.alternatives[0].transcript,
            start: data.start ?? 0,
            end: (data.start ?? 0) + (data.duration ?? 0),
            confidence: data.channel.alternatives[0].confidence ?? 0,
            isFinal: data.is_final ?? false,
          };

          if (resolveNext) {
            resolveNext(segment);
            resolveNext = null;
          } else {
            segments.push(segment);
          }
        }
      } catch {
        // Ignore parse errors for non-JSON messages
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
            provider: "deepgram",
          }),
        );
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    // Start sending audio in background
    const sendAudio = async () => {
      try {
        for await (const chunk of audioStream) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        }
        // Signal end of audio
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        }
      } catch {
        // Audio stream error, close connection
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
          provider: "deepgram",
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
   * Build query parameters for Deepgram API
   */
  private buildQueryParams(options: DeepgramSTTOptions): URLSearchParams {
    const params = new URLSearchParams();

    // Model selection
    params.set("model", options.model ?? "nova-3");

    // Language
    if (options.language) {
      params.set("language", options.language);
    } else {
      params.set("detect_language", "true");
    }

    // Punctuation
    if (options.punctuate !== false) {
      params.set("punctuate", "true");
    }

    // Smart formatting
    if (options.smartFormat) {
      params.set("smart_format", "true");
    }

    // Diarization
    if (options.diarization) {
      params.set("diarize", "true");
      if (options.speakerCount) {
        params.set("diarize_version", "3");
      }
    }

    // Utterances (sentence-level segmentation)
    if (options.utterances) {
      params.set("utterances", "true");
      if (options.utterSplit) {
        params.set("utt_split", options.utterSplit.toString());
      }
    }

    // Keywords/search terms
    if (options.keywords && options.keywords.length > 0) {
      for (const keyword of options.keywords) {
        params.append("keywords", keyword);
      }
    }

    // Filler words
    if (options.fillerWords) {
      params.set("filler_words", "true");
    }

    // Profanity filter
    if (options.profanityFilter) {
      params.set("profanity_filter", "true");
    }

    // Topic detection
    if (options.detectTopics) {
      params.set("detect_topics", "true");
    }

    // Entity detection
    if (options.detectEntities) {
      params.set("detect_entities", "true");
    }

    // Summarization
    if (options.summarize) {
      params.set("summarize", "true");
    }

    return params;
  }

  /**
   * Get content type for audio format
   */
  private getContentType(format?: string): string {
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
   * Map Deepgram response to STTResult
   */
  private mapToSTTResult(
    data: DeepgramResponse,
    latency: number,
    options: DeepgramSTTOptions,
  ): STTResult {
    const channel = data.results.channels[0];
    const alternative = channel?.alternatives[0];

    if (!alternative) {
      return {
        text: "",
        language: options.language ?? "en",
        segments: [],
        duration: data.metadata.duration,
        confidence: 0,
        metadata: {
          latency,
          provider: "deepgram",
          model: options.model ?? "nova-3",
          requestId: data.metadata.request_id,
        },
      };
    }

    // Build segments from utterances or create single segment
    const segments: TranscriptionSegment[] = [];

    if (data.results.utterances && data.results.utterances.length > 0) {
      for (const utterance of data.results.utterances) {
        segments.push({
          text: utterance.transcript,
          start: utterance.start,
          end: utterance.end,
          confidence: utterance.confidence,
          speaker:
            utterance.speaker !== undefined
              ? `speaker_${utterance.speaker}`
              : undefined,
          words: utterance.words.map((w) => ({
            word: w.punctuated_word ?? w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
            speaker:
              w.speaker !== undefined ? `speaker_${w.speaker}` : undefined,
          })),
          isFinal: true,
        });
      }
    } else if (alternative.words.length > 0) {
      // Create single segment from words
      const words = alternative.words;
      segments.push({
        text: alternative.transcript,
        start: words[0]?.start ?? 0,
        end: words[words.length - 1]?.end ?? data.metadata.duration,
        confidence: alternative.confidence,
        words: words.map((w) => ({
          word: w.punctuated_word ?? w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
          speaker: w.speaker !== undefined ? `speaker_${w.speaker}` : undefined,
        })),
        isFinal: true,
      });
    }

    // Count unique speakers
    const speakers = new Set<number>();
    for (const word of alternative.words) {
      if (word.speaker !== undefined) {
        speakers.add(word.speaker);
      }
    }

    return {
      text: alternative.transcript,
      language: options.language ?? "en",
      segments,
      duration: data.metadata.duration,
      confidence: alternative.confidence,
      metadata: {
        latency,
        provider: "deepgram",
        model: options.model ?? "nova-3",
        requestId: data.metadata.request_id,
        speakerCount: speakers.size > 0 ? speakers.size : undefined,
        channels: data.metadata.channels,
      },
    };
  }
}
