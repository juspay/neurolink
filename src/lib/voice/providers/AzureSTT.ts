/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * Implementation of STT using Azure Speech Services.
 *
 * @module voice/providers/AzureSTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  TTSAudioFormat,
  AzureRecognitionResult,
  AzureSTTOptions,
  STTCredentials,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
} from "../../types/index.js";
import { proxyAwareFetch } from "../../proxy/proxyFetch.js";

/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * Supports speech recognition with custom models and detailed output.
 *
 * @see https://docs.microsoft.com/azure/cognitive-services/speech-service/
 */
export class AzureSTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly region: string;

  /**
   * Maximum audio duration in seconds (60s — Azure's REST API for short audio
   * documented limit on `/speech/recognition/conversation/cognitiveservices/v1`).
   * For longer audio, use Azure Batch Transcription (not yet implemented) or
   * pre-segment the input.
   */
  public readonly maxAudioDuration = 60;

  /**
   * REST short-audio recognition has no stream. `transcribeStream()` on the
   * SDK streams this handler through the generic chunked adapter.
   */
  public readonly supportsStreaming = false;

  /**
   * @param apiKeyOrCredentials - The `credentials.stt.azure` slice (`apiKey`,
   *   `region`), or an API key (the original positional form).
   *   `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` fill whatever is left out.
   * @param region - Region, positional form only.
   */
  constructor(
    apiKeyOrCredentials?: string | STTCredentials["azure"],
    region?: string,
  ) {
    // `typeof x === "string"` narrows the same way with and without
    // strictNullChecks (the react-hooks build runs tsc without it); an
    // `=== undefined` test does not.
    const slice: NonNullable<STTCredentials["azure"]> =
      typeof apiKeyOrCredentials === "string"
        ? { apiKey: apiKeyOrCredentials, region }
        : { region, ...(apiKeyOrCredentials ?? {}) };
    const resolvedKey = (
      slice.apiKey ??
      process.env.AZURE_SPEECH_KEY ??
      ""
    ).trim();
    this.apiKey = resolvedKey.length > 0 ? resolvedKey : null;
    const resolvedRegion = (
      slice.region ??
      process.env.AZURE_SPEECH_REGION ??
      ""
    ).trim();
    this.region = resolvedRegion.length > 0 ? resolvedRegion : "eastus";
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.region.length > 0;
  }

  getSupportedFormats(): TTSAudioFormat[] {
    // Azure's "Speech-to-text REST API for short audio" only accepts uncompressed
    // PCM WAV (16kHz/16-bit/mono recommended) and Ogg/Opus. MP3 is NOT decoded
    // by this endpoint (it returns Success with empty text). For MP3 input use
    // the Batch Transcription API (not yet implemented) or convert to WAV first.
    return ["wav", "ogg", "opus"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Azure supports 100+ languages
    return [
      {
        code: "en-US",
        name: "English (US)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "en-GB",
        name: "English (UK)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "es-ES",
        name: "Spanish (Spain)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "es-MX",
        name: "Spanish (Mexico)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "fr-FR",
        name: "French",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "de-DE",
        name: "German",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "it-IT",
        name: "Italian",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "pt-BR",
        name: "Portuguese (Brazil)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ja-JP",
        name: "Japanese",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ko-KR",
        name: "Korean",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "zh-CN",
        name: "Chinese (Simplified)",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "hi-IN",
        name: "Hindi",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ar-SA",
        name: "Arabic",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
      {
        code: "ru-RU",
        name: "Russian",
        supportsDiarization: true,
        supportsPunctuation: true,
      },
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
      // Azure needs a language; "auto" (no pin) falls back to the default.
      params.set(
        "language",
        options.language && options.language.toLowerCase() !== "auto"
          ? options.language
          : "en-US",
      );

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
      const baseUrl = `https://${this.region}.stt.speech.microsoft.com`;
      if (azureOptions.customEndpointId) {
        params.set("cid", azureOptions.customEndpointId);
      }

      const url = `${baseUrl}/speech/recognition/conversation/cognitiveservices/v1?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await proxyAwareFetch(url, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": this.apiKey,
            "Content-Type": this.getContentType(options.format ?? "wav"),
            Accept: "application/json",
          },
          body: new Uint8Array(audioBuffer),
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw STTError.transcriptionFailed(
            "Azure STT request timed out after 30 seconds",
            "azure-stt",
            fetchErr,
          );
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

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
        duration: this.ticksToSeconds(data.Duration ?? 0),
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

      logger.info(`[AzureSTTHandler] Transcribed audio in ${latency}ms`);

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
   * Get Content-Type header for audio format
   */
  private getContentType(format: TTSAudioFormat): string {
    // Note: MP3 is intentionally not in this map even though Azure won't reject
    // the Content-Type — the short-audio REST endpoint silently returns empty
    // text for MP3 bodies. See getSupportedFormats() for the supported list.
    const contentTypes: Partial<Record<TTSAudioFormat, string>> = {
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
