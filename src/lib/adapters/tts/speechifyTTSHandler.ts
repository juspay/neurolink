/**
 * Speechify Text-to-Speech Handler
 *
 * Handler for Speechify TTS API integration.
 * Optimized for reading and accessibility with natural voice synthesis.
 *
 * @module adapters/tts/speechifyTTSHandler
 * @see https://speechify.com/api
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
 * Speechify voice engine options
 */
export type SpeechifyEngine = "standard" | "neural" | "resemble";

/**
 * Speechify audio format options
 */
export type SpeechifyAudioFormat = "mp3" | "wav" | "ogg";

/**
 * Speechify-specific TTS options
 */
export type SpeechifyTTSOptions = TTSOptions & {
  /** Voice engine to use */
  engine?: SpeechifyEngine;
  /** Enable SSML processing */
  ssml?: boolean;
  /** Audio sample rate (8000, 16000, 22050, 24000, 44100, 48000) */
  sampleRate?: number;
  /** Enable word boundary markers (for highlighting) */
  wordBoundaries?: boolean;
  /** Enable sentence boundary markers */
  sentenceBoundaries?: boolean;
  /** Voice model version */
  modelVersion?: string;
};

/**
 * Speechify API response types
 */
type SpeechifyVoiceResponse = {
  id: string;
  name: string;
  language_code: string;
  gender: string;
  engine: string;
  sample_url?: string;
  accent?: string;
};

type SpeechifySynthesisResponse = {
  audio_data: string; // Base64 encoded audio
  audio_format: string;
  sample_rate: number;
  duration_ms?: number;
  word_boundaries?: Array<{
    word: string;
    start_ms: number;
    end_ms: number;
  }>;
};

/**
 * Speechify Text-to-Speech Handler
 *
 * Implements both TTSHandler (for backward compatibility) and TTSProvider interfaces.
 * Optimized for reading and accessibility applications with natural pauses.
 *
 * @example
 * ```typescript
 * const handler = new SpeechifyTTSHandler();
 *
 * // Basic synthesis
 * const result = await handler.synthesize("Welcome to our audiobook.", {
 *   voice: "henry",
 *   format: "mp3",
 * });
 *
 * // With word boundaries for highlighting
 * const highlightResult = await handler.synthesize("Read along with me.", {
 *   voice: "henry",
 *   wordBoundaries: true,
 * });
 *
 * // Streaming for long-form content
 * for await (const chunk of handler.synthesizeStream("Long document...", {})) {
 *   playAudioChunk(chunk.data);
 * }
 * ```
 */
export class SpeechifyTTSHandler implements TTSHandler, TTSProvider {
  readonly name = "speechify";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Speechify maximum text length per request
   * Speechify supports long-form content
   */
  public readonly maxTextLength = 50000;

  /**
   * Predefined Speechify voices
   */
  private static readonly DEFAULT_VOICES: TTSVoice[] = [
    {
      id: "henry",
      name: "Henry",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "male",
      type: "neural",
      description: "American English - Warm, engaging narrator",
    },
    {
      id: "mia",
      name: "Mia",
      languageCode: "en-US",
      languageCodes: ["en-US"],
      gender: "female",
      type: "neural",
      description: "American English - Clear, friendly",
    },
    {
      id: "oliver",
      name: "Oliver",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "male",
      type: "neural",
      description: "British English - Professional narrator",
    },
    {
      id: "charlotte",
      name: "Charlotte",
      languageCode: "en-GB",
      languageCodes: ["en-GB"],
      gender: "female",
      type: "neural",
      description: "British English - Elegant, articulate",
    },
    {
      id: "simon",
      name: "Simon",
      languageCode: "en-AU",
      languageCodes: ["en-AU"],
      gender: "male",
      type: "neural",
      description: "Australian English - Natural",
    },
    {
      id: "chloe",
      name: "Chloe",
      languageCode: "en-AU",
      languageCodes: ["en-AU"],
      gender: "female",
      type: "neural",
      description: "Australian English - Friendly",
    },
    {
      id: "marc",
      name: "Marc",
      languageCode: "fr-FR",
      languageCodes: ["fr-FR"],
      gender: "male",
      type: "neural",
      description: "French - Clear narrator",
    },
    {
      id: "julia",
      name: "Julia",
      languageCode: "de-DE",
      languageCodes: ["de-DE"],
      gender: "female",
      type: "neural",
      description: "German - Professional",
    },
    {
      id: "carlos",
      name: "Carlos",
      languageCode: "es-ES",
      languageCodes: ["es-ES"],
      gender: "male",
      type: "neural",
      description: "Spanish - Engaging",
    },
    {
      id: "lucia",
      name: "Lucia",
      languageCode: "it-IT",
      languageCodes: ["it-IT"],
      gender: "female",
      type: "neural",
      description: "Italian - Expressive",
    },
  ];

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.SPEECHIFY_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.sws.speechify.com";
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
      return { valid: false, errors: ["SPEECHIFY_API_KEY not configured"] };
    }

    // Test API key with voices request
    try {
      const response = await fetch(`${this.baseUrl}/v1/voices`, {
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
   * Get available voices from Speechify
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      return languageCode
        ? SpeechifyTTSHandler.DEFAULT_VOICES.filter((v) =>
            v.languageCode.startsWith(languageCode),
          )
        : SpeechifyTTSHandler.DEFAULT_VOICES;
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp <
        SpeechifyTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/voices`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        logger.warn("Failed to fetch Speechify voices, using defaults");
        return SpeechifyTTSHandler.DEFAULT_VOICES;
      }

      const data = (await response.json()) as {
        voices: SpeechifyVoiceResponse[];
      };

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        languageCode: voice.language_code,
        languageCodes: [voice.language_code],
        gender: this.mapGender(voice.gender),
        type:
          voice.engine === "neural"
            ? ("neural" as const)
            : ("standard" as const),
        description: voice.accent
          ? `${voice.engine}, ${voice.accent}`
          : voice.engine,
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
      logger.error("Failed to fetch Speechify voices:", err);
      return SpeechifyTTSHandler.DEFAULT_VOICES;
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Speechify API key not configured. Set SPEECHIFY_API_KEY.",
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
    const speechifyOptions = options as SpeechifyTTSOptions;

    // Default voice: Henry (warm narrator)
    const voiceId = options.voice ?? "henry";
    const format = this.mapFormat(options.format ?? "mp3");

    try {
      const requestBody: Record<string, unknown> = {
        input: speechifyOptions.ssml ? undefined : text,
        ssml: speechifyOptions.ssml ? text : undefined,
        voice_id: voiceId,
        audio_format: format,
        speed: options.speed ?? 1.0,
      };

      // Add optional parameters
      if (speechifyOptions.engine) {
        requestBody.engine = speechifyOptions.engine;
      }
      if (speechifyOptions.sampleRate) {
        requestBody.sample_rate = speechifyOptions.sampleRate;
      }
      if (speechifyOptions.wordBoundaries) {
        requestBody.word_boundaries = true;
      }
      if (speechifyOptions.sentenceBoundaries) {
        requestBody.sentence_boundaries = true;
      }
      if (speechifyOptions.modelVersion) {
        requestBody.model_version = speechifyOptions.modelVersion;
      }

      const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
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
          message: `Speechify TTS failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as SpeechifySynthesisResponse;
      const latency = Date.now() - startTime;

      if (!data.audio_data) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Speechify returned no audio data",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      const buffer = Buffer.from(data.audio_data, "base64");

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice: voiceId,
        duration: data.duration_ms ? data.duration_ms / 1000 : undefined,
        sampleRate: data.sample_rate,
        metadata: {
          latency,
          provider: "speechify",
          engine: speechifyOptions.engine,
          wordBoundaries: data.word_boundaries,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) {
        throw err;
      }

      const latency = Date.now() - startTime;
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Speechify TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Stream audio synthesis for long-form content
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Speechify API key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const speechifyOptions = options as SpeechifyTTSOptions;
    const voiceId = options.voice ?? "henry";
    const format = this.mapFormat(options.format ?? "mp3");

    const requestBody: Record<string, unknown> = {
      input: speechifyOptions.ssml ? undefined : text,
      ssml: speechifyOptions.ssml ? text : undefined,
      voice_id: voiceId,
      audio_format: format,
      speed: options.speed ?? 1.0,
      stream: true,
    };

    if (speechifyOptions.engine) {
      requestBody.engine = speechifyOptions.engine;
    }

    const response = await fetch(`${this.baseUrl}/v1/audio/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Speechify streaming failed: ${response.status}`,
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
   * Map format to Speechify API format
   */
  private mapFormat(format: string): SpeechifyAudioFormat {
    switch (format.toLowerCase()) {
      case "mp3":
        return "mp3";
      case "wav":
        return "wav";
      case "ogg":
        return "ogg";
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
