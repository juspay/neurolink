/**
 * Google Cloud Speech-to-Text Handler
 *
 * Implementation of STT using Google Cloud Speech-to-Text API.
 *
 * @module voice/providers/GoogleSTT
 */

import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  AudioFormat,
  GoogleRecognitionAudio,
  GoogleRecognitionConfig,
  GoogleRecognizeResponse,
  GoogleSpeechRecognitionResult,
  GoogleSTTOptions,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  TranscriptionSegment,
  WordTiming,
} from "../../types/index.js";

/**
 * Google Cloud Speech-to-Text Handler
 *
 * Supports transcription with speaker diarization, word timestamps, and punctuation.
 *
 * @see https://cloud.google.com/speech-to-text/docs
 */
export class GoogleSTT implements STTHandler {
  private readonly apiKey: string | null;
  private readonly credentialsPath: string | null;
  private readonly baseUrl = "https://speech.googleapis.com/v1";

  /**
   * Maximum audio duration in seconds (480 minutes = 8 hours with async)
   */
  public readonly maxAudioDuration = 480 * 60;

  /**
   * Google STT supports streaming
   */
  public readonly supportsStreaming = true;

  constructor(apiKey?: string, credentialsPath?: string) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY ?? null;
    this.credentialsPath =
      credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null || this.credentialsPath !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav", "ogg", "opus"];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    // Return common languages supported by Google STT
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
        code: "es-US",
        name: "Spanish (US)",
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
        code: "zh-TW",
        name: "Chinese (Traditional)",
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
        code: "hi-IN",
        name: "Hindi",
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
    if (!this.isConfigured()) {
      throw STTError.providerNotConfigured("google-stt");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);

    if (audioBuffer.length === 0) {
      throw STTError.audioEmpty("google-stt");
    }

    const googleOptions = options as GoogleSTTOptions;
    const startTime = Date.now();

    try {
      // Build recognition config
      const detectedFormat = options.format ?? "wav";
      const config: GoogleRecognitionConfig = {
        encoding: this.getEncoding(detectedFormat),
        // Omit sampleRateHertz for WAV/FLAC — the API reads it from the header.
        // Hardcoding a wrong value causes "sample_rate_hertz must match WAV header" errors.
        ...(detectedFormat !== "wav" && detectedFormat !== "flac"
          ? { sampleRateHertz: options.sampleRate ?? 16000 }
          : options.sampleRate
            ? { sampleRateHertz: options.sampleRate }
            : {}),
        languageCode: options.language ?? "en-US",
        enableAutomaticPunctuation: options.punctuation ?? true,
        enableWordTimeOffsets: options.wordTimestamps ?? false,
        enableWordConfidence: true,
        profanityFilter: options.profanityFilter ?? false,
      };

      // Add model if specified
      if (googleOptions.model) {
        config.model = googleOptions.model;
      }

      // Add enhanced model option
      if (googleOptions.useEnhanced) {
        config.useEnhanced = true;
      }

      // Add diarization if requested
      if (options.speakerDiarization) {
        config.enableSpeakerDiarization = true;
        if (options.speakerCount) {
          config.diarizationSpeakerCount = options.speakerCount;
        }
      }

      // Add max alternatives
      if (googleOptions.maxAlternatives) {
        config.maxAlternatives = googleOptions.maxAlternatives;
      }

      // Build request
      const requestBody = {
        config,
        audio: {
          content: audioBuffer.toString("base64"),
        } as GoogleRecognitionAudio,
      };

      // Build URL with API key
      const url = this.apiKey
        ? `${this.baseUrl}/speech:recognize?key=${this.apiKey}`
        : `${this.baseUrl}/speech:recognize`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.credentialsPath && !this.apiKey
              ? { Authorization: `Bearer ${await this.getAccessToken()}` }
              : {}),
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw STTError.transcriptionFailed(
            "Google STT request timed out after 30 seconds",
            "google-stt",
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
        throw STTError.transcriptionFailed(errorMessage, "google-stt");
      }

      const data = (await response.json()) as GoogleRecognizeResponse;
      const latency = Date.now() - startTime;

      // Handle empty results
      if (!data.results || data.results.length === 0) {
        return {
          text: "",
          confidence: 0,
          language: options.language,
          metadata: {
            latency,
            provider: "google-stt",
          },
        };
      }

      // Build result from all alternatives
      const result: STTResult = {
        text: data.results
          .map((r) => r.alternatives[0]?.transcript ?? "")
          .join(" ")
          .trim(),
        confidence: this.calculateAverageConfidence(data.results),
        language: data.results[0]?.languageCode ?? options.language,
        metadata: {
          latency,
          provider: "google-stt",
          billedTime: data.totalBilledTime,
        },
      };

      // Add word timings
      const words: WordTiming[] = [];
      const speakers = new Set<string>();

      for (const resultItem of data.results) {
        const alternative = resultItem.alternatives[0];
        if (alternative?.words) {
          for (const wordInfo of alternative.words) {
            const word: WordTiming = {
              word: wordInfo.word,
              startTime: this.parseDuration(wordInfo.startTime),
              endTime: this.parseDuration(wordInfo.endTime),
              confidence: wordInfo.confidence,
            };

            if (wordInfo.speakerTag !== undefined) {
              word.speaker = `Speaker ${wordInfo.speakerTag}`;
              speakers.add(word.speaker);
            }

            words.push(word);
          }
        }
      }

      if (words.length > 0) {
        result.words = words;
      }

      if (speakers.size > 0) {
        result.speakers = Array.from(speakers);
      }

      // Add segments
      result.segments = data.results.map((resultItem, index) => {
        const alt = resultItem.alternatives[0];
        return {
          index,
          text: alt?.transcript ?? "",
          isFinal: true,
          confidence: alt?.confidence ?? 0,
          language: resultItem.languageCode,
        };
      });

      logger.info(`[GoogleSTTHandler] Transcribed audio in ${latency}ms`);

      return result;
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[GoogleSTTHandler] Transcription failed: ${errorMessage}`);
      throw STTError.transcriptionFailed(
        errorMessage,
        "google-stt",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Streaming transcription (placeholder - requires WebSocket/gRPC)
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment> {
    // Google streaming STT requires gRPC or WebSocket connection
    // For now, buffer and transcribe in chunks
    const chunks: Buffer[] = [];
    let chunkIndex = 0;

    for await (const chunk of audioStream) {
      chunks.push(chunk);

      // Process every ~5 seconds of audio (assuming 16kHz, 16-bit)
      const bytesPerSecond = 16000 * 2; // 16kHz * 2 bytes
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
            `[GoogleSTTHandler] Chunk transcription failed: ${err instanceof Error ? err.message : String(err)}`,
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
          `[GoogleSTTHandler] Final chunk transcription failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Get encoding string for audio format
   */
  private getEncoding(format: AudioFormat): string {
    const encodings: Partial<Record<AudioFormat, string>> = {
      mp3: "MP3",
      wav: "LINEAR16",
      ogg: "OGG_OPUS",
      opus: "OGG_OPUS",
    };
    return encodings[format] ?? "LINEAR16";
  }

  /**
   * Parse duration string (e.g., "1.5s") to seconds
   */
  private parseDuration(duration: string): number {
    if (!duration) {
      return 0;
    }
    const match = duration.match(/^([\d.]+)s$/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Calculate average confidence from results
   */
  private calculateAverageConfidence(
    results: GoogleSpeechRecognitionResult[],
  ): number {
    const confidences = results
      .map((r) => r.alternatives[0]?.confidence)
      .filter((c): c is number => typeof c === "number");

    if (confidences.length === 0) {
      return 0;
    }
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Get access token from service account credentials
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({
        ...(this.credentialsPath ? { keyFilename: this.credentialsPath } : {}),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      return tokenResponse.token ?? "";
    } catch (err) {
      logger.debug(
        `[GoogleSTTHandler] Failed to acquire access token: ${err instanceof Error ? err.message : String(err)}`,
      );
      return "";
    }
  }
}
