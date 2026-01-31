/**
 * Murf.ai Text-to-Speech Handler
 *
 * Handler for Murf.ai TTS API integration.
 * Provides professional AI voice-over with extensive voice library and emotions.
 *
 * @module adapters/tts/murfTTSHandler
 * @see https://murf.ai/api
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  Gender,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/ttsTypes.js";
import type { TTSProvider, VoiceCapability } from "../../types/voiceTypes.js";
import { logger } from "../../utils/logger.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * Murf voice style options for emotional expression
 */
export type MurfVoiceStyle =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "fearful"
  | "disgust"
  | "surprised";

/**
 * Murf audio format options
 */
export type MurfAudioFormat = "mp3" | "wav" | "flac" | "aac";

/**
 * Murf-specific TTS options
 */
export type MurfTTSOptions = TTSOptions & {
  /** Voice style/emotion */
  style?: MurfVoiceStyle;
  /** Emphasis level (0-2) */
  emphasis?: number;
  /** Model ID for specific voice variant */
  modelId?: string;
  /** Enable pronunciation guide processing */
  pronunciationGuide?: boolean;
  /** Custom pronunciation dictionary */
  pronunciations?: Record<string, string>;
  /** Audio sample rate (8000, 16000, 22050, 24000, 44100, 48000) */
  sampleRate?: number;
  /** Audio bit rate for MP3 (64, 128, 192, 256, 320) */
  bitRate?: number;
};

/**
 * Murf API response types
 */
type MurfVoiceResponse = {
  voiceId: string;
  displayName: string;
  languageCode: string;
  gender: string;
  style?: string;
  ageGroup?: string;
  sampleUrl?: string;
};

type MurfSynthesisResponse = {
  audioFile: string; // Base64 encoded audio or URL
  audioFormat: string;
  durationMs?: number;
  requestId?: string;
};

/**
 * Murf.ai Text-to-Speech Handler
 *
 * Implements both TTSHandler (for backward compatibility) and TTSProvider interfaces.
 * Provides professional AI voice-over capabilities with emotions and style control.
 *
 * @example
 * ```typescript
 * const handler = new MurfTTSHandler();
 *
 * // Basic synthesis
 * const result = await handler.synthesize("Welcome to our product demo.", {
 *   voice: "en-US-natalie",
 *   format: "mp3",
 * });
 *
 * // With emotion/style
 * const emotionalResult = await handler.synthesize("I'm so excited!", {
 *   voice: "en-US-natalie",
 *   style: "happy",
 * });
 * ```
 */
export class MurfTTSHandler implements TTSHandler, TTSProvider {
  readonly name = "murf";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Murf maximum text length per request
   */
  public readonly maxTextLength = 10000;

  /**
   * Predefined Murf voices (subset - Murf has 120+ voices)
   */
  private static readonly DEFAULT_VOICES: TTSVoice[] = [
    {
      id: "en-US-natalie",
      name: "Natalie",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "female",
      type: "neural",
      description: "American English - Professional, warm",
    },
    {
      id: "en-US-miles",
      name: "Miles",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "male",
      type: "neural",
      description: "American English - Conversational",
    },
    {
      id: "en-GB-ruby",
      name: "Ruby",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "female",
      type: "neural",
      description: "British English - Professional",
    },
    {
      id: "en-GB-george",
      name: "George",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "male",
      type: "neural",
      description: "British English - Authoritative",
    },
    {
      id: "de-DE-anna",
      name: "Anna",
      languageCode: "de-DE",
      languageCodes: ["de-DE"],
      gender: "female",
      type: "neural",
      description: "German - Natural, clear",
    },
    {
      id: "fr-FR-claire",
      name: "Claire",
      languageCode: "fr-FR",
      languageCodes: ["fr-FR"],
      gender: "female",
      type: "neural",
      description: "French - Elegant, professional",
    },
    {
      id: "es-ES-lucia",
      name: "Lucia",
      languageCode: "es-ES",
      languageCodes: ["es-ES"],
      gender: "female",
      type: "neural",
      description: "Spanish - Warm, friendly",
    },
    {
      id: "pt-BR-fernanda",
      name: "Fernanda",
      languageCode: "pt-BR",
      languageCodes: ["pt-BR"],
      gender: "female",
      type: "neural",
      description: "Brazilian Portuguese - Engaging",
    },
    {
      id: "hi-IN-priya",
      name: "Priya",
      languageCode: "hi-IN",
      languageCodes: ["hi-IN"],
      gender: "female",
      type: "neural",
      description: "Hindi - Natural, expressive",
    },
    {
      id: "ja-JP-yuki",
      name: "Yuki",
      languageCode: "ja-JP",
      languageCodes: ["ja-JP"],
      gender: "female",
      type: "neural",
      description: "Japanese - Professional",
    },
  ];

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.MURF_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.murf.ai/v1";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["tts"];
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
      return { valid: false, errors: ["MURF_API_KEY not configured"] };
    }

    // Test API key with a voices request
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return {
        valid: response.ok,
        errors: response.ok ? [] : ["Invalid API key or API error"],
      };
    } catch {
      return { valid: false, errors: ["Network error validating API key"] };
    }
  }

  /**
   * Get available voices from Murf
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      // Return default voices if not configured
      return languageCode
        ? MurfTTSHandler.DEFAULT_VOICES.filter((v) =>
            v.languageCode.startsWith(languageCode),
          )
        : MurfTTSHandler.DEFAULT_VOICES;
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < MurfTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const url = languageCode
        ? `${this.baseUrl}/voices?language=${encodeURIComponent(languageCode)}`
        : `${this.baseUrl}/voices`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        logger.warn("Failed to fetch Murf voices, using defaults");
        return MurfTTSHandler.DEFAULT_VOICES;
      }

      const data = (await response.json()) as { voices: MurfVoiceResponse[] };

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.voiceId,
        name: voice.displayName,
        languageCode: voice.languageCode,
        languageCodes: [voice.languageCode],
        gender: this.mapGender(voice.gender),
        type: "neural" as const,
        description: voice.ageGroup
          ? `${voice.ageGroup}${voice.style ? `, ${voice.style}` : ""}`
          : undefined,
      }));

      // Cache if no filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return voices;
    } catch (err) {
      logger.error("Failed to fetch Murf voices:", err);
      return MurfTTSHandler.DEFAULT_VOICES;
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Murf API key not configured. Set MURF_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    if (!text || text.trim().length === 0) {
      throw new TTSError({
        code: TTS_ERROR_CODES.EMPTY_TEXT,
        message: "Text input is empty",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
      });
    }

    if (text.length > this.maxTextLength) {
      throw new TTSError({
        code: TTS_ERROR_CODES.TEXT_TOO_LONG,
        message: `Text exceeds maximum length of ${this.maxTextLength} characters`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { length: text.length, maxLength: this.maxTextLength },
      });
    }

    const startTime = Date.now();
    const murfOptions = options as MurfTTSOptions;

    // Default voice: Natalie (American English female)
    const voiceId = options.voice ?? "en-US-natalie";
    const format = this.mapFormat(options.format ?? "mp3");

    try {
      const requestBody: Record<string, unknown> = {
        text,
        voiceId,
        format,
        speed: options.speed ?? 1.0,
      };

      // Add optional parameters
      if (murfOptions.style) {
        requestBody.style = murfOptions.style;
      }
      if (murfOptions.emphasis !== undefined) {
        requestBody.emphasis = Math.max(0, Math.min(2, murfOptions.emphasis));
      }
      if (options.pitch !== undefined) {
        requestBody.pitch = options.pitch;
      }
      if (murfOptions.sampleRate) {
        requestBody.sampleRate = murfOptions.sampleRate;
      }
      if (murfOptions.bitRate) {
        requestBody.bitRate = murfOptions.bitRate;
      }
      if (murfOptions.pronunciations) {
        requestBody.pronunciations = murfOptions.pronunciations;
      }

      const response = await fetch(`${this.baseUrl}/speech/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Murf TTS failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as MurfSynthesisResponse;
      const latency = Date.now() - startTime;

      // Handle both base64 and URL responses
      let buffer: Buffer;
      if (data.audioFile.startsWith("http")) {
        // Audio is returned as URL - download it
        const audioResponse = await fetch(data.audioFile);
        if (!audioResponse.ok) {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "Failed to download generated audio",
            category: ErrorCategory.EXECUTION,
            severity: ErrorSeverity.HIGH,
            retriable: true,
          });
        }
        const arrayBuffer = await audioResponse.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        // Audio is base64 encoded
        buffer = Buffer.from(data.audioFile, "base64");
      }

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        duration: data.durationMs ? data.durationMs / 1000 : undefined,
        metadata: {
          latency,
          provider: "murf",
          style: murfOptions.style,
          requestId: data.requestId,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Murf TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Map format to Murf API format
   */
  private mapFormat(format: string): MurfAudioFormat {
    switch (format.toLowerCase()) {
      case "mp3":
        return "mp3";
      case "wav":
        return "wav";
      case "flac":
        return "flac";
      case "aac":
        return "aac";
      default:
        return "mp3";
    }
  }

  /**
   * Map gender string to Gender type
   */
  private mapGender(gender?: string): Gender {
    if (!gender) {
      return "neutral";
    }
    const g = gender.toLowerCase();
    if (g === "male" || g === "m") {
      return "male";
    }
    if (g === "female" || g === "f") {
      return "female";
    }
    return "neutral";
  }
}
