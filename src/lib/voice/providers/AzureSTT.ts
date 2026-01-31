/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * Implementation of STT using Azure Speech Services.
 *
 * @module voice/providers/AzureSTT
 */

import type { STTHandler } from "../STTProvider.js";
import type {
  STTOptions,
  STTResult,
  STTLanguage,
  TranscriptionSegment,
  AudioFormat,
  WordTiming,
} from "../types/voiceTypes.js";
import { STTError } from "../errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Azure STT-specific options
 */
export type AzureSTTOptions = STTOptions & {
  /** Custom endpoint ID for custom models */
  customEndpointId?: string;
  /** Enable detailed output */
  detailed?: boolean;
  /** Profanity handling mode */
  profanityMode?: "masked" | "removed" | "raw";
  /** Word-level confidence */
  wordLevelConfidence?: boolean;
  /** Initial silence timeout in ms */
  initialSilenceTimeoutMs?: number;
  /** End silence timeout in ms */
  endSilenceTimeoutMs?: number;
};

/**
 * Azure STT API response types
 */
type AzureWord = {
  Word: string;
  Offset: number;
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
  RecognitionStatus: string;
  Offset: number;
  Duration: number;
  DisplayText?: string;
  NBest?: AzureNBest[];
};

/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * Supports speech recognition with custom models and detailed output.
 *
 * @see https://docs.microsoft.com/azure/cognitive-services/speech-service/
 */
export class AzureSTTHandler implements STTHandler {
  private readonly apiKey: string | null;
  private readonly region: string;

  /**
   * Maximum audio duration in seconds (4 hours)
   */
  public readonly maxAudioDuration = 240 * 60;

  /**
   * Azure STT supports streaming
   */
  public readonly supportsStreaming = true;

  constructor(apiKey?: string, region?: string) {
    this.apiKey = apiKey ?? process.env.AZURE_SPEECH_KEY ?? null;
    this.region = region ?? process.env.AZURE_SPEECH_REGION ?? "eastus";
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav", "ogg"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Azure supports 100+ languages
    return [
      { code: "en-US", name: "English (US)", supportsDiarization: true, supportsPunctuation: true },
      { code: "en-GB", name: "English (UK)", supportsDiarization: true, supportsPunctuation: true },
      { code: "es-ES", name: "Spanish (Spain)", supportsDiarization: true, supportsPunctuation: true },
      { code: "es-MX", name: "Spanish (Mexico)", supportsDiarization: true, supportsPunctuation: true },
      { code: "fr-FR", name: "French", supportsDiarization: true, supportsPunctuation: true },
      { code: "de-DE", name: "German", supportsDiarization: true, supportsPunctuation: true },
      { code: "it-IT", name: "Italian", supportsDiarization: true, supportsPunctuation: true },
      { code: "pt-BR", name: "Portuguese (Brazil)", supportsDiarization: true, supportsPunctuation: true },
      { code: "ja-JP", name: "Japanese", supportsDiarization: true, supportsPunctuation: true },
      { code: "ko-KR", name: "Korean", supportsDiarization: true, supportsPunctuation: true },
      { code: "zh-CN", name: "Chinese (Simplified)", supportsDiarization: true, supportsPunctuation: true },
      { code: "hi-IN", name: "Hindi", supportsDiarization: true, supportsPunctuation: true },
      { code: "ar-SA", name: "Arabic", supportsDiarization: true, supportsPunctuation: true },
      { code: "ru-RU", name: "Russian", supportsDiarization: true, supportsPunctuation: true },
    ];
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    if (!this.apiKey) {
      throw STTError.providerNotConfigured("azure-stt");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("azure-stt");
    }

    const azureOptions = options as AzureSTTOptions;
    const startTime = Date.now();

    try {
      // Build the URL with query parameters
      const params = new URLSearchParams();
      params.set("language", options.language ?? "en-US");

      // Add detailed output format
      if (azureOptions.detailed || options.wordTimestamps) {
        params.set("format", "detailed");
      }

      // Add profanity mode
      if (azureOptions.profanityMode) {
        params.set("profanity", azureOptions.profanityMode);
      } else if (options.profanityFilter) {
        params.set("profanity", "masked");
      }

      // Add custom endpoint if provided
      let baseUrl = `https://${this.region}.stt.speech.microsoft.com`;
      if (azureOptions.customEndpointId) {
        params.set("cid", azureOptions.customEndpointId);
      }

      const url = `${baseUrl}/speech/recognition/conversation/cognitiveservices/v1?${params.toString()}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
          "Content-Type": this.getContentType(options.format ?? "wav"),
          Accept: "application/json",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw STTError.transcriptionFailed(
          `HTTP ${response.status}: ${errorText}`,
          "azure-stt",
        );
      }

      const data = (await response.json()) as AzureRecognitionResult;
      const latency = Date.now() - startTime;

      // Check recognition status
      if (data.RecognitionStatus !== "Success") {
        if (data.RecognitionStatus === "NoMatch") {
          return {
            text: "",
            confidence: 0,
            language: options.language,
            metadata: {
              latency,
              provider: "azure-stt",
              status: data.RecognitionStatus,
            },
          };
        }

        throw STTError.transcriptionFailed(
          `Recognition failed: ${data.RecognitionStatus}`,
          "azure-stt",
        );
      }

      // Build result from NBest or DisplayText
      const result: STTResult = {
        text: data.DisplayText ?? "",
        confidence: 0.9, // Default confidence if not available
        language: options.language,
        duration: this.ticksToSeconds(data.Duration),
        metadata: {
          latency,
          provider: "azure-stt",
          status: data.RecognitionStatus,
        },
      };

      // Process NBest results if available
      if (data.NBest && data.NBest.length > 0) {
        const best = data.NBest[0];
        result.text = best.Display;
        result.confidence = best.Confidence;

        // Add word timings
        if (best.Words && best.Words.length > 0) {
          result.words = best.Words.map((word) => ({
            word: word.Word,
            startTime: this.ticksToSeconds(word.Offset),
            endTime: this.ticksToSeconds(word.Offset + word.Duration),
            confidence: word.Confidence,
          }));
        }
      }

      logger.info(
        `[AzureSTTHandler] Transcribed audio in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[AzureSTTHandler] Transcription failed: ${errorMessage}`);
      throw STTError.transcriptionFailed(
        errorMessage,
        "azure-stt",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Streaming transcription (placeholder - requires SDK)
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment> {
    // Azure streaming requires the Microsoft Speech SDK
    // For now, buffer and transcribe in chunks
    const chunks: Buffer[] = [];
    let chunkIndex = 0;

    for await (const chunk of audioStream) {
      chunks.push(chunk);

      // Process every ~5 seconds of audio
      const bytesPerSecond = (options.sampleRate ?? 16000) * 2;
      const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);

      if (totalBytes >= bytesPerSecond * 5) {
        const audio = Buffer.concat(chunks);
        chunks.length = 0;

        try {
          const result = await this.transcribe(audio, options);

          yield {
            index: chunkIndex++,
            text: result.text,
            isFinal: false,
            confidence: result.confidence,
          };
        } catch (err) {
          logger.warn(
            `[AzureSTTHandler] Chunk transcription failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    // Process remaining audio
    if (chunks.length > 0) {
      const audio = Buffer.concat(chunks);
      try {
        const result = await this.transcribe(audio, options);
        yield {
          index: chunkIndex,
          text: result.text,
          isFinal: true,
          confidence: result.confidence,
        };
      } catch (err) {
        logger.warn(
          `[AzureSTTHandler] Final chunk transcription failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Get Content-Type header for audio format
   */
  private getContentType(format: AudioFormat): string {
    const contentTypes: Record<AudioFormat, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav; codecs=audio/pcm; samplerate=16000",
      ogg: "audio/ogg; codecs=opus",
      opus: "audio/ogg; codecs=opus",
    };
    return contentTypes[format] ?? "audio/wav";
  }

  /**
   * Convert Azure ticks (100ns units) to seconds
   */
  private ticksToSeconds(ticks: number): number {
    return ticks / 10000000;
  }
}
