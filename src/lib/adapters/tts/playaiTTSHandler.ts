/**
 * Play.ai Text-to-Speech Handler
 *
 * Handler for Play.ai TTS API integration.
 * Provides ultra-realistic voice synthesis with emotional expression and streaming.
 *
 * @module adapters/tts/playaiTTSHandler
 * @see https://docs.play.ai/
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  Gender,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/ttsTypes.js";
import type {
  TTSProvider,
  TTSStreamChunk,
  VoiceCapability,
} from "../../types/voiceTypes.js";
import { logger } from "../../utils/logger.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * Play.ai voice emotion options
 */
export type PlayAIEmotion =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "surprised"
  | "fearful"
  | "disgusted";

/**
 * Play.ai voice quality options
 */
export type PlayAIQuality = "draft" | "standard" | "premium";

/**
 * Play.ai-specific TTS options
 */
export type PlayAITTSOptions = TTSOptions & {
  /** Voice emotion/style */
  emotion?: PlayAIEmotion;
  /** Emotion intensity (0-1) */
  emotionIntensity?: number;
  /** Voice quality tier */
  quality?: PlayAIQuality;
  /** Enable voice cloning (requires voice clone ID) */
  voiceCloneId?: string;
  /** Temperature for voice variation (0-1) */
  temperature?: number;
  /** Seed for reproducible synthesis */
  seed?: number;
  /** Enable SSML processing */
  ssml?: boolean;
};

/**
 * Play.ai API response types
 */
type PlayAIVoiceResponse = {
  id: string;
  name: string;
  language: string;
  gender: string;
  accent?: string;
  age_group?: string;
  preview_url?: string;
  is_cloned?: boolean;
};

type PlayAISynthesisResponse = {
  audio_url?: string;
  audio_data?: string; // Base64 encoded
  duration_seconds?: number;
  characters_used?: number;
  request_id?: string;
};

/**
 * Play.ai Text-to-Speech Handler
 *
 * Implements both TTSHandler (for backward compatibility) and TTSProvider interfaces.
 * Provides ultra-realistic voice synthesis with emotional expression.
 *
 * @example
 * ```typescript
 * const handler = new PlayAITTSHandler();
 *
 * // Basic synthesis
 * const result = await handler.synthesize("Hello, world!", {
 *   voice: "jennifer",
 *   format: "mp3",
 * });
 *
 * // With emotion
 * const happyResult = await handler.synthesize("Great news!", {
 *   voice: "jennifer",
 *   emotion: "happy",
 *   emotionIntensity: 0.8,
 * });
 *
 * // Streaming synthesis
 * for await (const chunk of handler.synthesizeStream("Long text...", {})) {
 *   playAudioChunk(chunk.data);
 * }
 * ```
 */
export class PlayAITTSHandler implements TTSHandler, TTSProvider {
  readonly name = "playai";
  private readonly apiKey: string | null;
  private readonly userId: string | null;
  private readonly baseUrl: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Play.ai maximum text length per request
   */
  public readonly maxTextLength = 5000;

  /**
   * Predefined Play.ai voices (subset)
   */
  private static readonly DEFAULT_VOICES: TTSVoice[] = [
    {
      id: "jennifer",
      name: "Jennifer",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "female",
      type: "neural",
      description: "American English - Natural, conversational",
    },
    {
      id: "michael",
      name: "Michael",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "male",
      type: "neural",
      description: "American English - Professional",
    },
    {
      id: "emma",
      name: "Emma",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "female",
      type: "neural",
      description: "British English - Sophisticated",
    },
    {
      id: "james",
      name: "James",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "male",
      type: "neural",
      description: "British English - Authoritative",
    },
    {
      id: "sophie",
      name: "Sophie",
      languageCode: "fr-FR",
      languageCodes: ["fr-FR"],
      gender: "female",
      type: "neural",
      description: "French - Elegant",
    },
    {
      id: "hans",
      name: "Hans",
      languageCode: "de-DE",
      languageCodes: ["de-DE"],
      gender: "male",
      type: "neural",
      description: "German - Clear, professional",
    },
    {
      id: "maria",
      name: "Maria",
      languageCode: "es-ES",
      languageCodes: ["es-ES"],
      gender: "female",
      type: "neural",
      description: "Spanish - Warm, expressive",
    },
    {
      id: "alessandro",
      name: "Alessandro",
      languageCode: "it-IT",
      languageCodes: ["it-IT"],
      gender: "male",
      type: "neural",
      description: "Italian - Expressive",
    },
    {
      id: "yuki",
      name: "Yuki",
      languageCode: "ja-JP",
      languageCodes: ["ja-JP"],
      gender: "female",
      type: "neural",
      description: "Japanese - Natural",
    },
    {
      id: "wei",
      name: "Wei",
      languageCode: "zh-CN",
      languageCodes: ["zh-CN"],
      gender: "female",
      type: "neural",
      description: "Mandarin Chinese - Clear",
    },
  ];

  constructor(apiKey?: string, userId?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.PLAYAI_API_KEY ?? null;
    this.userId = userId ?? process.env.PLAYAI_USER_ID ?? null;
    this.baseUrl = baseUrl ?? "https://api.play.ai/api/v1";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["tts", "streaming"];
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
      return { valid: false, errors: ["PLAYAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get available voices from Play.ai
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      return languageCode
        ? PlayAITTSHandler.DEFAULT_VOICES.filter((v) =>
            v.languageCode.startsWith(languageCode),
          )
        : PlayAITTSHandler.DEFAULT_VOICES;
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < PlayAITTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-User-ID": this.userId ?? "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        logger.warn("Failed to fetch Play.ai voices, using defaults");
        return PlayAITTSHandler.DEFAULT_VOICES;
      }

      const data = (await response.json()) as { voices: PlayAIVoiceResponse[] };

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        languageCode: voice.language,
        languageCodes: [voice.language],
        gender: this.mapGender(voice.gender),
        type: "neural" as const,
        description: [voice.accent, voice.age_group].filter(Boolean).join(", "),
      }));

      const filteredVoices = languageCode
        ? voices.filter((v) => v.languageCode.startsWith(languageCode))
        : voices;

      // Cache if no filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return filteredVoices;
    } catch (err) {
      logger.error("Failed to fetch Play.ai voices:", err);
      return PlayAITTSHandler.DEFAULT_VOICES;
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Play.ai API key not configured. Set PLAYAI_API_KEY.",
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
    const playaiOptions = options as PlayAITTSOptions;

    // Default voice: Jennifer
    const voiceId = options.voice ?? "jennifer";
    const format = options.format ?? "mp3";

    try {
      const requestBody: Record<string, unknown> = {
        text,
        voice: playaiOptions.voiceCloneId ?? voiceId,
        output_format: format,
        speed: options.speed ?? 1.0,
      };

      // Add optional parameters
      if (playaiOptions.emotion) {
        requestBody.emotion = playaiOptions.emotion;
        if (playaiOptions.emotionIntensity !== undefined) {
          requestBody.emotion_intensity = Math.max(
            0,
            Math.min(1, playaiOptions.emotionIntensity),
          );
        }
      }
      if (playaiOptions.quality) {
        requestBody.quality = playaiOptions.quality;
      }
      if (playaiOptions.temperature !== undefined) {
        requestBody.temperature = Math.max(
          0,
          Math.min(1, playaiOptions.temperature),
        );
      }
      if (playaiOptions.seed !== undefined) {
        requestBody.seed = playaiOptions.seed;
      }
      if (playaiOptions.ssml) {
        requestBody.ssml = true;
      }

      const response = await fetch(`${this.baseUrl}/tts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "X-User-ID": this.userId ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Play.ai TTS failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as PlayAISynthesisResponse;
      const latency = Date.now() - startTime;

      // Handle both URL and base64 responses
      let buffer: Buffer;
      if (data.audio_url) {
        const audioResponse = await fetch(data.audio_url);
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
      } else if (data.audio_data) {
        buffer = Buffer.from(data.audio_data, "base64");
      } else {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Play.ai returned no audio data",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      return {
        buffer,
        format,
        size: buffer.length,
        voice: voiceId,
        duration: data.duration_seconds,
        metadata: {
          latency,
          provider: "playai",
          emotion: playaiOptions.emotion,
          quality: playaiOptions.quality,
          charactersUsed: data.characters_used,
          requestId: data.request_id,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Play.ai TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Stream audio synthesis for real-time playback
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Play.ai API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const playaiOptions = options as PlayAITTSOptions;
    const voiceId = options.voice ?? "jennifer";

    const requestBody: Record<string, unknown> = {
      text,
      voice: playaiOptions.voiceCloneId ?? voiceId,
      output_format: options.format ?? "mp3",
      speed: options.speed ?? 1.0,
      stream: true,
    };

    if (playaiOptions.emotion) {
      requestBody.emotion = playaiOptions.emotion;
    }
    if (playaiOptions.quality) {
      requestBody.quality = playaiOptions.quality;
    }

    const response = await fetch(`${this.baseUrl}/tts/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-User-ID": this.userId ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Play.ai streaming failed: ${response.status}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
      });
    }

    const reader = response.body.getReader();
    let index = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          yield {
            data: Buffer.alloc(0),
            index,
            isFinal: true,
            format: options.format ?? "mp3",
          };
          break;
        }

        yield {
          data: Buffer.from(value),
          index: index++,
          isFinal: false,
          format: options.format ?? "mp3",
        };
      }
    } finally {
      reader.releaseLock();
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
