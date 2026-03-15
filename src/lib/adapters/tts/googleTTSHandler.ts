/**
 * Google Cloud Text-to-Speech Handler
 *
 * Handler for Google Cloud Text-to-Speech API integration.
 *
 * @module adapters/tts/googleTTSHandler
 * @see https://cloud.google.com/text-to-speech/docs
 */
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type {
  Gender,
  GoogleAudioEncoding,
  TTSOptions,
  TTSResult,
  TTSVoice,
  VoiceType,
} from "../../types/ttsTypes.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
} from "../../observability/index.js";
import { getMetricsAggregator } from "../../observability/index.js";

export class GoogleTTSHandler implements TTSHandler {
  private client: TextToSpeechClient | null = null;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Google Cloud TTS maximum input size.
   * ~5000 bytes INCLUDING SSML tags.
   */
  private static readonly DEFAULT_MAX_TEXT_LENGTH = 5000;

  /**
   * Default timeout for Google Cloud TTS API calls (milliseconds)
   *
   * Google typically responds within:
   * - 1–5 seconds for short or normal text
   * - 5–10 seconds for longer text or Neural2 voices
   */
  private static readonly DEFAULT_API_TIMEOUT_MS = 30 * 1000;

  /**
   * Maximum text length supported by Google Cloud TTS (in bytes).
   *
   * NOTE:
   * Validation against this limit is performed by the shared TTS processor
   * before invoking provider handlers, not inside this class.
   */
  public readonly maxTextLength: number =
    GoogleTTSHandler.DEFAULT_MAX_TEXT_LENGTH;

  constructor(credentialsPath?: string) {
    const path = credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (path) {
      this.client = new TextToSpeechClient({ keyFilename: path });
    }
  }

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can generate TTS
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Get available voices for the provider
   *
   * Note: This method is optional in the TTSHandler interface, but Google Cloud TTS
   * fully implements it to provide comprehensive voice discovery capabilities.
   *
   * @param languageCode - Optional language filter (e.g., "en-US")
   * @returns List of available voices
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.client) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Google Cloud TTS client not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or pass credentials path.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const span = SpanSerializer.createSpan(
      SpanType.TTS,
      "tts.google.listVoices",
      {
        "tts.operation": "listVoices",
        "tts.provider": "google",
      },
    );

    try {
      // Return cached voices if available, valid, and no language filter is specified
      if (
        this.voicesCache &&
        Date.now() - this.voicesCache.timestamp <
          GoogleTTSHandler.CACHE_TTL_MS &&
        !languageCode
      ) {
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);
        return this.voicesCache.voices;
      }

      // Call Google Cloud listVoices API
      const [response] = await this.client.listVoices(
        languageCode ? { languageCode } : {},
      );

      if (!response.voices || response.voices.length === 0) {
        logger.warn("Google Cloud TTS returned no voices");
        const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
        getMetricsAggregator().recordSpan(endedSpan);
        return [];
      }

      const voices: TTSVoice[] = [];

      for (const voice of response.voices ?? []) {
        // Validate required fields
        if (
          !voice.name ||
          !Array.isArray(voice.languageCodes) ||
          voice.languageCodes.length === 0
        ) {
          logger.warn("Skipping voice with missing required fields", {
            name: voice.name,
            languageCodesCount: voice.languageCodes?.length,
          });
          continue;
        }

        const voiceName = voice.name;
        const languageCodes = voice.languageCodes;
        const primaryLanguageCode = languageCodes[0];

        const voiceType = this.detectVoiceType(voiceName);

        // Map Google's ssmlGender → internal Gender
        const gender: Gender =
          voice.ssmlGender === "MALE"
            ? "male"
            : voice.ssmlGender === "FEMALE"
              ? "female"
              : "neutral";

        voices.push({
          id: voiceName,
          name: voiceName,
          languageCode: primaryLanguageCode,
          languageCodes,
          gender,
          type: voiceType,
          naturalSampleRateHertz: voice.naturalSampleRateHertz ?? undefined,
        });
      }

      // Cache the result with timestamp if no language filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);
      return voices;
    } catch (err) {
      // Record error span
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : "Unknown error",
      );
      getMetricsAggregator().recordSpan(endedSpan);
      // Log error but return empty array for graceful degradation
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to fetch Google TTS voices: ${message}`);
      return [];
    }
  }

  /**
   * Generate audio from text using provider-specific TTS API
   *
   * @param text - Text or SSML to convert to speech
   * @param options - TTS configuration options
   * @returns Audio buffer with metadata
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.client) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Google Cloud TTS client not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or pass credentials path.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const voiceId = options.voice ?? "en-US-Neural2-C";
    const span = SpanSerializer.createSpan(
      SpanType.TTS,
      "tts.google.synthesize",
      {
        "tts.operation": "synthesize",
        "tts.provider": "google",
        "tts.voice": voiceId,
        "tts.format": options.format ?? "mp3",
      },
    );
    const startTime = Date.now();

    try {
      const isSSML = text.startsWith("<speak>") && text.endsWith("</speak>");
      // Note: This validation only checks for the presence of opening and closing <speak> tags.
      // Other SSML validation, such as malformed structure, unclosed inner tags, or invalid elements,
      // will be handled by Google's API.
      if (
        (text.startsWith("<speak>") && !text.endsWith("</speak>")) ||
        (!text.startsWith("<speak>") && text.endsWith("</speak>"))
      ) {
        throw new TTSError({
          code: TTS_ERROR_CODES.INVALID_INPUT,
          message:
            "Malformed SSML: missing opening <speak> or closing </speak> tag.",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
        });
      }

      const languageCode = this.extractLanguageCode(voiceId);
      const audioEncoding = this.mapFormat(options.format ?? "mp3");

      const request = {
        input: isSSML ? { ssml: text } : { text },
        voice: {
          name: voiceId,
          languageCode,
        },
        audioConfig: {
          audioEncoding,
          speakingRate: options.speed ?? 1.0,
          pitch: options.pitch ?? 0.0,
          volumeGainDb: options.volumeGainDb ?? 0.0,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request, {
        timeout: GoogleTTSHandler.DEFAULT_API_TIMEOUT_MS,
      });

      const audioContent = response.audioContent;

      if (!audioContent) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Google TTS returned empty audio content",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      const buffer =
        audioContent instanceof Uint8Array
          ? Buffer.from(audioContent)
          : typeof audioContent === "string"
            ? Buffer.from(audioContent, "base64")
            : (() => {
                throw new TTSError({
                  code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
                  message:
                    "Unsupported audioContent type returned by Google TTS",
                  category: ErrorCategory.EXECUTION,
                  severity: ErrorSeverity.HIGH,
                  retriable: true,
                  context: { type: typeof audioContent },
                });
              })();

      const latency = Date.now() - startTime;

      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        metadata: {
          latency,
          provider: "google-ai",
        },
      };
    } catch (err) {
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(endedSpan);

      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Google TTS failed after ${latency}ms: ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Extract language code from a Google Cloud voice name
   *
   * Example:
   *   "en-US-Neural2-C" -> "en-US"
   *
   * @param voiceId - Google Cloud voice identifier
   * @returns Language code compatible with Google TTS
   */
  private extractLanguageCode(voiceId: string): string {
    const parts = voiceId.split("-");
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    } else {
      throw new TTSError({
        code: TTS_ERROR_CODES.INVALID_INPUT,
        message: `Invalid Google TTS voiceId format: "${voiceId}". Expected format like "en-US-Neural2-C".`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { voiceId },
      });
    }
  }

  /**
   * Map application audio format to Google Cloud audio encoding
   *
   * @param format - Audio format requested by the caller
   * @returns Google Cloud AudioEncoding enum value
   * @throws Error if format is unsupported
   */
  private mapFormat(format: string): GoogleAudioEncoding {
    switch (format.toLowerCase()) {
      case "mp3":
        return "MP3";
      case "wav":
        return "LINEAR16";
      case "ogg":
      case "opus":
        return "OGG_OPUS";
      default:
        throw new TTSError({
          code: TTS_ERROR_CODES.INVALID_INPUT,
          message: `Unsupported audio format: ${format}`,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { format },
        });
    }
  }

  /**
   * Detect the voice type from a Google Cloud TTS voice name
   *
   * Parses the voice name to identify the underlying voice technology/model type.
   * Google Cloud TTS offers different voice types with varying quality and pricing.
   *
   * @param name - The full Google Cloud voice name (e.g., "en-US-Neural2-C")
   * @returns The detected voice type
   *
   * @example
   * detectVoiceType("en-US-Neural2-C") // returns "neural"
   * detectVoiceType("en-US-Wavenet-A") // returns "wavenet"
   * detectVoiceType("en-US-Standard-B") // returns "standard"
   * detectVoiceType("en-US-Chirp-A") // returns "chirp"
   * detectVoiceType("en-US-Journey-D") // returns "unknown" (unrecognized type)
   */
  private detectVoiceType(name: string): VoiceType {
    const tokens = name.toLowerCase().split("-");

    if (tokens.some((t) => t.startsWith("chirp"))) {
      return "chirp";
    }
    if (tokens.includes("neural2")) {
      return "neural";
    }
    if (tokens.includes("wavenet")) {
      return "wavenet";
    }
    if (tokens.includes("standard")) {
      return "standard";
    }

    return "unknown";
  }
}
