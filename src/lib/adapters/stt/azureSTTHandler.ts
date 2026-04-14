/**
 * Azure Speech-to-Text Handler
 *
 * Handler for Azure Cognitive Services Speech-to-Text API integration.
 * Provides enterprise-grade transcription with streaming and batch support.
 *
 * @module adapters/stt/azureSTTHandler
 * @see https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/
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
 * Azure STT recognition mode
 */
export type AzureRecognitionMode =
  | "interactive" // Short utterances up to 15 seconds
  | "conversation" // Conversational speech
  | "dictation"; // Long-form dictation

/**
 * Azure STT output format
 */
export type AzureOutputFormat = "simple" | "detailed";

/**
 * Azure STT-specific options
 */
export type AzureSTTOptions = STTOptions & {
  /** Recognition mode */
  recognitionMode?: AzureRecognitionMode;
  /** Output format (simple or detailed) */
  outputFormat?: AzureOutputFormat;
  /** Enable interim results for streaming */
  interimResults?: boolean;
  /** Custom endpoint ID (for custom speech models) */
  endpointId?: string;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Silence timeout (end of speech) in milliseconds */
  silenceTimeout?: number;
  /** Enable profanity masking (masked, removed, raw) */
  profanityOption?: "masked" | "removed" | "raw";
  /** Initial silence timeout in milliseconds */
  initialSilenceTimeout?: number;
  /** Enable logging */
  enableLogging?: boolean;
  /** Custom phrases for recognition */
  phraseList?: string[];
};

/**
 * Azure STT API response types
 */
type AzureWord = {
  Word: string;
  Offset: number; // In 100-nanosecond units
  Duration: number;
  Confidence?: number;
};

type AzureNBest = {
  Confidence: number;
  Lexical: string;
  ITN: string;
  MaskedITN: string;
  Display: string;
  Words?: AzureWord[];
};

type AzureRecognitionResult = {
  RecognitionStatus:
    | "Success"
    | "NoMatch"
    | "InitialSilenceTimeout"
    | "BabbleTimeout"
    | "Error";
  Offset?: number;
  Duration?: number;
  DisplayText?: string;
  NBest?: AzureNBest[];
};

type AzureSpeakerRecognitionResult = AzureRecognitionResult & {
  SpeakerId?: string;
};

/**
 * Azure Speech-to-Text Handler
 *
 * Supports both synchronous recognition and batch transcription.
 *
 * @example
 * ```typescript
 * const handler = new AzureSTTHandler();
 *
 * const result = await handler.transcribe(audioBuffer, {
 *   language: "en-US",
 *   recognitionMode: "conversation",
 *   outputFormat: "detailed",
 * });
 * ```
 */
export class AzureSTTHandler implements STTProvider {
  readonly name = "azure-stt";
  private readonly subscriptionKey: string | null;
  private readonly region: string;

  /**
   * Supported audio formats
   */
  private static readonly SUPPORTED_FORMATS = [
    "wav",
    "mp3",
    "ogg",
    "flac",
    "webm",
  ];

  /**
   * Supported languages (subset - Azure supports 100+ languages)
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

  constructor(subscriptionKey?: string, region?: string) {
    this.subscriptionKey =
      subscriptionKey ?? process.env.AZURE_SPEECH_KEY ?? null;
    this.region = region ?? process.env.AZURE_SPEECH_REGION ?? "eastus";
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
    return this.subscriptionKey !== null;
  }

  /**
   * Validate provider configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!this.subscriptionKey) {
      errors.push("AZURE_SPEECH_KEY not configured");
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    return AzureSTTHandler.SUPPORTED_LANGUAGES;
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return AzureSTTHandler.SUPPORTED_FORMATS;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.subscriptionKey) {
      throw STTError.providerNotConfigured("azure-stt");
    }

    const buffer = audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;

    if (buffer.length === 0) {
      throw STTError.audioEmpty("azure-stt");
    }

    // Validate format if specified
    if (options.format && !VALID_STT_AUDIO_FORMATS.includes(options.format)) {
      throw STTError.invalidFormat(options.format, "azure-stt");
    }

    const startTime = Date.now();
    const azureOptions = options as AzureSTTOptions;

    try {
      const result = await this.recognizeContinuous(buffer, azureOptions);
      const latency = Date.now() - startTime;
      return this.mapToSTTResult(result, latency, azureOptions);
    } catch (err) {
      if (err instanceof STTError) {
        throw err;
      }

      throw STTError.transcriptionFailed(
        err instanceof Error ? err.message : "Unknown error",
        err instanceof Error ? err : undefined,
        "azure-stt",
      );
    }
  }

  /**
   * Continuous recognition for the entire audio
   */
  private async recognizeContinuous(
    buffer: Buffer,
    options: AzureSTTOptions,
  ): Promise<AzureRecognitionResult[]> {
    const language = options.language ?? "en-US";
    const mode = options.recognitionMode ?? "conversation";
    const format = options.outputFormat ?? "detailed";

    // Build URL
    const baseUrl = `https://${this.region}.stt.speech.microsoft.com`;
    const endpoint = `/speech/recognition/${mode}/cognitiveservices/v1`;
    const params = new URLSearchParams({
      language,
      format,
    });

    if (options.profanityFilter || options.profanityOption) {
      params.set("profanity", options.profanityOption ?? "masked");
    }

    if (options.endpointId) {
      params.set("cid", options.endpointId);
    }

    const url = `${baseUrl}${endpoint}?${params.toString()}`;

    // Determine content type based on format
    const contentType = this.getContentType(options.format ?? "wav");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.subscriptionKey!,
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `Azure STT failed: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        provider: "azure-stt",
      });
    }

    const data = (await response.json()) as AzureRecognitionResult;

    // Check recognition status
    if (data.RecognitionStatus === "Error") {
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: "Azure STT recognition error",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        provider: "azure-stt",
      });
    }

    if (
      data.RecognitionStatus === "NoMatch" ||
      data.RecognitionStatus === "InitialSilenceTimeout"
    ) {
      // Return empty result for no speech detected
      return [];
    }

    return [data];
  }

  /**
   * Stream transcription (real-time audio input)
   *
   * Uses Azure Speech SDK WebSocket protocol for streaming.
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.subscriptionKey) {
      throw STTError.providerNotConfigured("azure-stt");
    }

    const azureOptions = options as AzureSTTOptions;
    const language = options.language ?? "en-US";

    // Azure Speech WebSocket URL
    const wsUrl = `wss://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(language)}`;

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
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
      },
    });

    // Handle incoming transcription results
    ws.onmessage = (event: MessageEvent) => {
      try {
        const messageStr =
          typeof event.data === "string" ? event.data : event.data.toString();

        // Azure uses a custom message format with path prefix
        // Parse the JSON portion
        const jsonStart = messageStr.indexOf("{");
        if (jsonStart === -1) {
          return;
        }

        const data = JSON.parse(
          messageStr.substring(jsonStart),
        ) as AzureSpeakerRecognitionResult;

        if (data.RecognitionStatus === "Success" && data.DisplayText) {
          const isFinal = !azureOptions.interimResults;
          const segment: TranscriptionSegment = {
            text: data.DisplayText,
            start: data.Offset ? data.Offset / 10000000 : 0, // Convert from 100ns to seconds
            end: data.Duration
              ? (data.Offset ?? 0) / 10000000 + data.Duration / 10000000
              : 0,
            confidence:
              data.NBest && data.NBest.length > 0
                ? data.NBest[0]!.Confidence
                : 0.9,
            isFinal,
            speaker: data.SpeakerId,
            words:
              data.NBest?.[0]?.Words?.map((w) => ({
                word: w.Word,
                start: w.Offset / 10000000,
                end: (w.Offset + w.Duration) / 10000000,
                confidence: w.Confidence ?? 0.9,
              })) ?? undefined,
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
            provider: "azure-stt",
          }),
        );
      }, azureOptions.connectionTimeout ?? 10000);

      ws.onopen = () => {
        clearTimeout(timeout);

        // Send speech config message
        const configMessage = {
          context: {
            system: {
              name: "neurolink",
              version: "1.0.0",
            },
            os: {
              platform: "nodejs",
              name: process.platform,
            },
            audio: {
              source: {
                connectivity: "Unknown",
              },
            },
          },
        };
        ws.send(
          `Path: speech.config\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(configMessage)}`,
        );

        resolve();
      };
    });

    // Start sending audio in background
    const sendAudio = async () => {
      try {
        const requestId = this.generateRequestId();

        for await (const chunk of audioStream) {
          if (ws.readyState === WebSocket.OPEN) {
            // Send audio chunks with Azure header format
            const header = `Path: audio\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: audio/x-wav\r\n\r\n`;
            const headerBuffer = Buffer.from(header);

            // Combine header and audio data
            const message = Buffer.concat([headerBuffer, chunk]);
            ws.send(message);
          }
        }

        // Signal end of audio stream
        if (ws.readyState === WebSocket.OPEN) {
          const endMessage = `Path: audio\r\nX-RequestId: ${requestId}\r\nX-Timestamp: ${new Date().toISOString()}\r\nContent-Type: audio/x-wav\r\n\r\n`;
          ws.send(endMessage);
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
          provider: "azure-stt",
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
   * Get content type based on audio format
   */
  private getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case "wav":
        return "audio/wav; codecs=audio/pcm; samplerate=16000";
      case "mp3":
        return "audio/mpeg";
      case "ogg":
        return "audio/ogg; codecs=opus";
      case "flac":
        return "audio/flac";
      case "webm":
        return "audio/webm; codecs=opus";
      default:
        return "audio/wav; codecs=audio/pcm; samplerate=16000";
    }
  }

  /**
   * Generate a request ID for Azure Speech
   */
  private generateRequestId(): string {
    // Azure expects a specific format for request IDs
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Map Azure response to STTResult
   */
  private mapToSTTResult(
    results: AzureRecognitionResult[],
    latency: number,
    options: AzureSTTOptions,
  ): STTResult {
    const segments: TranscriptionSegment[] = [];
    let fullText = "";
    let totalConfidence = 0;
    let resultCount = 0;
    let totalDuration = 0;

    for (const result of results) {
      if (result.RecognitionStatus !== "Success") {
        continue;
      }

      const bestResult = result.NBest?.[0];
      const text = bestResult?.Display ?? result.DisplayText ?? "";

      if (!text) {
        continue;
      }

      fullText += (fullText ? " " : "") + text;

      const confidence = bestResult?.Confidence ?? 0.9;
      totalConfidence += confidence;
      resultCount++;

      // Calculate times (Azure uses 100-nanosecond units)
      const startTime = result.Offset
        ? result.Offset / 10000000
        : totalDuration;
      const duration = result.Duration ? result.Duration / 10000000 : 0;
      const endTime = startTime + duration;
      totalDuration = endTime;

      const segment: TranscriptionSegment = {
        text,
        start: startTime,
        end: endTime,
        confidence,
        isFinal: true,
        words: bestResult?.Words?.map((w) => ({
          word: w.Word,
          start: w.Offset / 10000000,
          end: (w.Offset + w.Duration) / 10000000,
          confidence: w.Confidence ?? confidence,
        })),
      };

      segments.push(segment);
    }

    return {
      text: fullText,
      language: options.language ?? "en-US",
      segments,
      duration: totalDuration,
      confidence: resultCount > 0 ? totalConfidence / resultCount : 0.9,
      metadata: {
        latency,
        provider: "azure-stt",
        region: this.region,
        recognitionMode: options.recognitionMode ?? "conversation",
      },
    };
  }
}
