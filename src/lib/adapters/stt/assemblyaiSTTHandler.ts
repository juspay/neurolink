/**
 * AssemblyAI Speech-to-Text Handler
 *
 * Handler for AssemblyAI STT API integration with streaming support.
 * Provides advanced transcription with speaker diarization, summarization,
 * and sentiment analysis.
 *
 * @module adapters/stt/assemblyaiSTTHandler
 * @see https://www.assemblyai.com/docs
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
 * AssemblyAI-specific STT options
 */
export type AssemblyAISTTOptions = STTOptions & {
  /** AssemblyAI model: best, nano */
  model?: "best" | "nano";
  /** Enable automatic punctuation and casing */
  formatText?: boolean;
  /** Enable dual channel processing */
  dualChannel?: boolean;
  /** Webhook URL for async transcription */
  webhookUrl?: string;
  /** Webhook authentication header */
  webhookAuthHeaderName?: string;
  /** Webhook authentication header value */
  webhookAuthHeaderValue?: string;
  /** Enable topic detection */
  iabCategories?: boolean;
  /** Enable content moderation */
  contentSafety?: boolean;
  /** Enable sentiment analysis */
  sentimentAnalysis?: boolean;
  /** Enable entity detection */
  entityDetection?: boolean;
  /** Enable summarization */
  summarization?: boolean;
  /** Summarization model: informative, conversational, catchy */
  summaryModel?: "informative" | "conversational" | "catchy";
  /** Summarization type: bullets, headline, paragraph, etc. */
  summaryType?:
    | "bullets"
    | "bullets_verbose"
    | "headline"
    | "paragraph"
    | "gist";
  /** Auto chapters/highlights */
  autoChapters?: boolean;
  /** Auto highlights */
  autoHighlights?: boolean;
  /** Custom spelling dictionary */
  customSpelling?: Array<{ from: string[]; to: string }>;
  /** Boost specific words */
  wordBoost?: string[];
  /** Word boost parameter (low, default, high) */
  boostParam?: "low" | "default" | "high";
  /** Filter profanity */
  filterProfanity?: boolean;
  /** Redact PII */
  redactPii?: boolean;
  /** Types of PII to redact */
  redactPiiPolicies?: string[];
};

/**
 * AssemblyAI API response types
 */
type AssemblyAIWord = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
};

type AssemblyAIUtterance = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
  words: AssemblyAIWord[];
};

type AssemblyAIUploadResponse = {
  upload_url: string;
};

type AssemblyAITranscriptResponse = {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text?: string;
  words?: AssemblyAIWord[];
  utterances?: AssemblyAIUtterance[];
  audio_duration?: number;
  language_code?: string;
  language_confidence?: number;
  confidence?: number;
  summary?: string;
  chapters?: Array<{
    headline: string;
    summary: string;
    start: number;
    end: number;
    gist: string;
  }>;
  iab_categories_result?: Record<string, number>;
  sentiment_analysis_results?: Array<{
    text: string;
    sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    confidence: number;
    start: number;
    end: number;
  }>;
  entities?: Array<{
    text: string;
    entity_type: string;
    start: number;
    end: number;
  }>;
  error?: string;
};

/**
 * AssemblyAI Speech-to-Text Handler
 *
 * Supports async transcription with polling and real-time streaming.
 *
 * @example
 * ```typescript
 * const handler = new AssemblyAISTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en",
 *   diarization: true,
 *   sentimentAnalysis: true,
 *   summarization: true,
 * });
 * ```
 */
export class AssemblyAISTTHandler implements STTProvider {
  readonly name = "assemblyai";
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
  ];

  /**
   * Supported languages (subset - AssemblyAI supports 99+ languages)
   */
  private static readonly SUPPORTED_LANGUAGES = [
    "en",
    "en-US",
    "en-GB",
    "en-AU",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "hi",
    "ja",
    "zh",
    "ko",
    "ru",
    "pl",
    "tr",
    "uk",
    "vi",
    "id",
    "ar",
    "fi",
    "sv",
    "da",
    "no",
    "cs",
    "ro",
    "hu",
    "el",
    "he",
    "th",
  ];

  /**
   * Maximum polling attempts for transcription results
   */
  private static readonly MAX_POLL_ATTEMPTS = 120;

  /**
   * Polling interval in milliseconds
   */
  private static readonly POLL_INTERVAL_MS = 3000;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.ASSEMBLYAI_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.assemblyai.com/v2";
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
      return { valid: false, errors: ["ASSEMBLYAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return AssemblyAISTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return AssemblyAISTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("assemblyai");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.audioEmpty("assemblyai");
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "assemblyai");
    }

    const startTime = Date.now();
    const assemblyaiOptions = options as AssemblyAISTTOptions;

    try {
      // Step 1: Upload audio file
      const uploadUrl = await this.uploadAudio(buffer);

      // Step 2: Create transcription request
      const transcriptId = await this.createTranscript(
        uploadUrl,
        assemblyaiOptions,
      );

      // Step 3: Poll for results
      const result = await this.pollForResults(transcriptId);

      const latency = Date.now() - startTime;

      return this.mapToSTTResult(result, latency, assemblyaiOptions);
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "assemblyai",
      );
    }
  }

  /**
   * Stream transcription (real-time audio input)
   *
   * Uses AssemblyAI's WebSocket-based real-time transcription.
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("assemblyai");
    }

    const assemblyaiOptions = options as AssemblyAISTTOptions;

    // Get temporary token for WebSocket connection
    const tokenResponse = await fetch(`${this.baseUrl}/realtime/token`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_in: 3600, // 1 hour
      }),
    });

    if (!tokenResponse.ok) {
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: "Failed to get realtime token",
        category: ErrorCategory.PERMISSION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        provider: "assemblyai",
      });
    }

    const { token } = (await tokenResponse.json()) as { token: string };

    // Build WebSocket URL
    const wsParams = new URLSearchParams();
    wsParams.set("sample_rate", "16000");
    if (assemblyaiOptions.wordBoost && assemblyaiOptions.wordBoost.length > 0) {
      wsParams.set("word_boost", JSON.stringify(assemblyaiOptions.wordBoost));
    }

    const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?${wsParams.toString()}`;

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
        Authorization: token,
      },
    });

    // Handle incoming transcription results
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : event.data.toString(),
        ) as {
          message_type?: string;
          text?: string;
          confidence?: number;
          audio_start?: number;
          audio_end?: number;
          words?: Array<{
            text: string;
            start: number;
            end: number;
            confidence: number;
          }>;
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

        if (
          (data.message_type === "PartialTranscript" ||
            data.message_type === "FinalTranscript") &&
          data.text
        ) {
          const segment: TranscriptionSegment = {
            text: data.text,
            start: data.audio_start ? data.audio_start / 1000 : 0,
            end: data.audio_end ? data.audio_end / 1000 : 0,
            confidence: data.confidence ?? 0.9,
            isFinal: data.message_type === "FinalTranscript",
            words: data.words?.map((w) => ({
              word: w.text,
              start: w.start / 1000,
              end: w.end / 1000,
              confidence: w.confidence,
            })),
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
            provider: "assemblyai",
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
            // Send audio as base64
            ws.send(JSON.stringify({ audio_data: chunk.toString("base64") }));
          }
        }
        // Signal end of audio
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ terminate_session: true }));
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
          provider: "assemblyai",
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
   * Upload audio file to AssemblyAI
   */
  private async uploadAudio(buffer: Buffer): Promise<string> {
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey!,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `AssemblyAI upload failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "assemblyai",
      });
    }

    const data = (await response.json()) as AssemblyAIUploadResponse;
    return data.upload_url;
  }

  /**
   * Create transcription request
   */
  private async createTranscript(
    audioUrl: string,
    options: AssemblyAISTTOptions,
  ): Promise<string> {
    const requestBody: Record<string, unknown> = {
      audio_url: audioUrl,
      speech_model: options.model ?? "best",
    };

    // Language
    if (options.language) {
      requestBody.language_code = options.language.split("-")[0];
    } else {
      requestBody.language_detection = true;
    }

    // Punctuation and formatting
    if (options.punctuate !== false || options.formatText !== false) {
      requestBody.punctuate = true;
      requestBody.format_text = true;
    }

    // Diarization
    if (options.diarization) {
      requestBody.speaker_labels = true;
      if (options.speakerCount) {
        requestBody.speakers_expected = options.speakerCount;
      }
    }

    // Dual channel
    if (options.dualChannel) {
      requestBody.dual_channel = true;
    }

    // IAB categories (topic detection)
    if (options.iabCategories) {
      requestBody.iab_categories = true;
    }

    // Content safety (moderation)
    if (options.contentSafety) {
      requestBody.content_safety = true;
    }

    // Sentiment analysis
    if (options.sentimentAnalysis) {
      requestBody.sentiment_analysis = true;
    }

    // Entity detection
    if (options.entityDetection) {
      requestBody.entity_detection = true;
    }

    // Summarization
    if (options.summarization) {
      requestBody.summarization = true;
      if (options.summaryModel) {
        requestBody.summary_model = options.summaryModel;
      }
      if (options.summaryType) {
        requestBody.summary_type = options.summaryType;
      }
    }

    // Auto chapters
    if (options.autoChapters) {
      requestBody.auto_chapters = true;
    }

    // Auto highlights
    if (options.autoHighlights) {
      requestBody.auto_highlights = true;
    }

    // Custom spelling
    if (options.customSpelling && options.customSpelling.length > 0) {
      requestBody.custom_spelling = options.customSpelling;
    }

    // Word boost
    if (options.wordBoost && options.wordBoost.length > 0) {
      requestBody.word_boost = options.wordBoost;
      if (options.boostParam) {
        requestBody.boost_param = options.boostParam;
      }
    }

    // Profanity filter
    if (options.filterProfanity || options.profanityFilter) {
      requestBody.filter_profanity = true;
    }

    // PII redaction
    if (options.redactPii) {
      requestBody.redact_pii = true;
      if (options.redactPiiPolicies && options.redactPiiPolicies.length > 0) {
        requestBody.redact_pii_policies = options.redactPiiPolicies;
      }
    }

    // Webhook
    if (options.webhookUrl) {
      requestBody.webhook_url = options.webhookUrl;
      if (options.webhookAuthHeaderName && options.webhookAuthHeaderValue) {
        requestBody.webhook_auth_header_name = options.webhookAuthHeaderName;
        requestBody.webhook_auth_header_value = options.webhookAuthHeaderValue;
      }
    }

    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `AssemblyAI transcript creation failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "assemblyai",
      });
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  /**
   * Poll for transcription results
   */
  private async pollForResults(
    transcriptId: string,
  ): Promise<AssemblyAITranscriptResponse> {
    for (let i = 0; i < AssemblyAISTTHandler.MAX_POLL_ATTEMPTS; i++) {
      const response = await fetch(
        `${this.baseUrl}/transcript/${transcriptId}`,
        {
          headers: {
            Authorization: this.apiKey!,
          },
        },
      );

      if (!response.ok) {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `AssemblyAI result fetch failed: ${response.status}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
          provider: "assemblyai",
        });
      }

      const result = (await response.json()) as AssemblyAITranscriptResponse;

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "error") {
        throw new STTError({
          code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
          message: `AssemblyAI transcription error: ${result.error ?? "Unknown error"}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          provider: "assemblyai",
        });
      }

      // Wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, AssemblyAISTTHandler.POLL_INTERVAL_MS),
      );
    }

    throw new STTError({
      code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
      message: "AssemblyAI transcription timed out",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      provider: "assemblyai",
    });
  }

  /**
   * Map AssemblyAI response to STTResult
   */
  private mapToSTTResult(
    data: AssemblyAITranscriptResponse,
    latency: number,
    options: AssemblyAISTTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = [];

    // Build segments from utterances (if diarization enabled) or words
    if (data.utterances && data.utterances.length > 0) {
      for (const utterance of data.utterances) {
        segments.push({
          text: utterance.text,
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          confidence: utterance.confidence,
          speaker: utterance.speaker,
          words: utterance.words.map((w) => ({
            word: w.text,
            start: w.start / 1000,
            end: w.end / 1000,
            confidence: w.confidence,
            speaker: w.speaker,
          })),
          isFinal: true,
        });
      }
    } else if (data.words && data.words.length > 0) {
      // Create single segment from words
      segments.push({
        text: data.text ?? "",
        start: data.words[0]!.start / 1000,
        end: data.words[data.words.length - 1]!.end / 1000,
        confidence: data.confidence ?? 0.9,
        words: data.words.map((w) => ({
          word: w.text,
          start: w.start / 1000,
          end: w.end / 1000,
          confidence: w.confidence,
          speaker: w.speaker,
        })),
        isFinal: true,
      });
    }

    // Count unique speakers
    const speakers = new Set<string>();
    if (data.utterances) {
      for (const utterance of data.utterances) {
        speakers.add(utterance.speaker);
      }
    }

    return {
      text: data.text ?? "",
      language: data.language_code ?? options.language ?? "en",
      segments,
      duration: data.audio_duration ?? 0,
      confidence: data.confidence ?? 0.9,
      metadata: {
        latency,
        provider: "assemblyai",
        model: options.model ?? "best",
        speakerCount: speakers.size > 0 ? speakers.size : undefined,
        languageConfidence: data.language_confidence,
        summary: data.summary,
        chapters: data.chapters,
        sentimentAnalysis: data.sentiment_analysis_results,
        entities: data.entities,
        iabCategories: data.iab_categories_result,
      },
    };
  }
}
