/**
 * Google Cloud Text-to-Speech Handler
 *
 * Implementation of TTS using Google Cloud TTS API.
 *
 * @module voice/providers/GoogleTTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  AudioFormat,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/ttsTypes.js";
import { logger } from "../../utils/logger.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * Google TTS voice types
 */
export type GoogleVoiceType =
  | "Standard"
  | "WaveNet"
  | "Neural2"
  | "Studio"
  | "Polyglot";

/**
 * Google-specific TTS options
 */
export type GoogleTTSOptions = TTSOptions & {
  /** Voice type filter */
  voiceType?: GoogleVoiceType;
  /** Sample rate in Hz */
  sampleRateHertz?: number;
  /** Effects profile ID */
  effectsProfileId?: string[];
};

/**
 * Google TTS API types
 */
type GoogleAudioConfig = {
  audioEncoding: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  sampleRateHertz?: number;
  effectsProfileId?: string[];
};

type GoogleVoiceSelectionParams = {
  languageCode: string;
  name?: string;
  ssmlGender?: string;
};

type GoogleSynthesisInput = {
  text?: string;
  ssml?: string;
};

type GoogleSynthesizeRequest = {
  input: GoogleSynthesisInput;
  voice: GoogleVoiceSelectionParams;
  audioConfig: GoogleAudioConfig;
};

type GoogleVoiceInfo = {
  languageCodes: string[];
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
};

type GoogleListVoicesResponse = {
  voices: GoogleVoiceInfo[];
};

type GoogleSynthesizeResponse = {
  audioContent: string;
};

/**
 * Google Cloud Text-to-Speech Handler
 *
 * Supports Neural2, WaveNet, and Standard voices with SSML.
 *
 * @see https://cloud.google.com/text-to-speech/docs
 */
export class GoogleTTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly credentialsPath: string | null;
  private readonly baseUrl = "https://texttospeech.googleapis.com/v1";
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Maximum text length (5000 bytes)
   */
  public readonly maxTextLength = 5000;

  constructor(apiKey?: string, credentialsPath?: string) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY ?? null;
    this.credentialsPath =
      credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null || this.credentialsPath !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.isConfigured()) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Google TTS is not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached voices if valid and no language filter
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < GoogleTTS.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const params = new URLSearchParams();
      if (languageCode) {
        params.set("languageCode", languageCode);
      }

      const url = this.apiKey
        ? `${this.baseUrl}/voices?key=${this.apiKey}&${params.toString()}`
        : `${this.baseUrl}/voices?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(this.credentialsPath && !this.apiKey
            ? { Authorization: `Bearer ${await this.getAccessToken()}` }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as GoogleListVoicesResponse;

      const voices: TTSVoice[] = data.voices.map((voice) => ({
        id: voice.name,
        name: voice.name,
        languageCode: voice.languageCodes[0] ?? "en-US",
        languageCodes: voice.languageCodes,
        gender: this.mapGender(voice.ssmlGender),
        type: this.extractVoiceType(voice.name),
        naturalSampleRateHertz: voice.naturalSampleRateHertz,
      }));

      // Cache if no language filter
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return voices;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[GoogleTTSHandler] Failed to get voices: ${errorMessage}`);
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Failed to get voices: ${errorMessage}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.isConfigured()) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Google TTS is not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const googleOptions = options as GoogleTTSOptions;

    try {
      // Detect if text is SSML
      const isSSML = text.trim().startsWith("<speak");

      // Build synthesis input
      const input: GoogleSynthesisInput = isSSML ? { ssml: text } : { text };

      // Parse voice and language from voice name or use defaults
      const voiceName = options.voice ?? "en-US-Neural2-C";
      const languageCode = this.extractLanguageCode(voiceName);

      // Build voice selection
      const voice: GoogleVoiceSelectionParams = {
        languageCode,
        name: voiceName,
      };

      // Build audio config
      const audioConfig: GoogleAudioConfig = {
        audioEncoding: this.getEncoding(options.format ?? "mp3"),
        speakingRate: options.speed ?? 1.0,
        pitch: options.pitch ?? 0.0,
        volumeGainDb: options.volumeGainDb ?? 0.0,
      };

      if (googleOptions.sampleRateHertz) {
        audioConfig.sampleRateHertz = googleOptions.sampleRateHertz;
      }

      if (googleOptions.effectsProfileId) {
        audioConfig.effectsProfileId = googleOptions.effectsProfileId;
      }

      // Build request
      const request: GoogleSynthesizeRequest = {
        input,
        voice,
        audioConfig,
      };

      const url = this.apiKey
        ? `${this.baseUrl}/text:synthesize?key=${this.apiKey}`
        : `${this.baseUrl}/text:synthesize`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.credentialsPath && !this.apiKey
            ? { Authorization: `Bearer ${await this.getAccessToken()}` }
            : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { error?: { message?: string } }).error?.message ||
          `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as GoogleSynthesizeResponse;
      const latency = Date.now() - startTime;

      // Decode base64 audio
      const audioBuffer = Buffer.from(data.audioContent, "base64");

      const result: TTSResult = {
        buffer: audioBuffer,
        format: options.format ?? "mp3",
        size: audioBuffer.length,
        voice: voiceName,
        sampleRate:
          googleOptions.sampleRateHertz ??
          this.getDefaultSampleRate(options.format),
        metadata: {
          latency,
          provider: "google-tts",
          encoding: audioConfig.audioEncoding,
        },
      };

      logger.info(
        `[GoogleTTSHandler] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof TTSError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[GoogleTTSHandler] Synthesis failed: ${errorMessage}`);
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Synthesis failed: ${errorMessage}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { textLength: text.length },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Map SSML gender to standard gender type
   */
  private mapGender(ssmlGender: string): "male" | "female" | "neutral" {
    switch (ssmlGender?.toUpperCase()) {
      case "MALE":
        return "male";
      case "FEMALE":
        return "female";
      default:
        return "neutral";
    }
  }

  /**
   * Extract voice type from voice name
   */
  private extractVoiceType(
    name: string,
  ): "standard" | "wavenet" | "neural" | "chirp" | "unknown" {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("neural2") || nameLower.includes("neural")) {
      return "neural";
    }
    if (nameLower.includes("wavenet")) {
      return "wavenet";
    }
    if (nameLower.includes("standard")) {
      return "standard";
    }
    if (nameLower.includes("chirp")) {
      return "chirp";
    }
    return "unknown";
  }

  /**
   * Extract language code from voice name
   */
  private extractLanguageCode(voiceName: string): string {
    // Voice names are formatted like "en-US-Neural2-C"
    const match = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
    return match ? match[1] : "en-US";
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
    return encodings[format] ?? "MP3";
  }

  /**
   * Get default sample rate for format
   */
  private getDefaultSampleRate(format?: AudioFormat): number {
    switch (format) {
      case "wav":
        return 16000;
      case "ogg":
      case "opus":
        return 24000;
      default:
        return 24000;
    }
  }

  /**
   * Get access token from service account (placeholder)
   */
  private async getAccessToken(): Promise<string> {
    logger.warn(
      "[GoogleTTSHandler] Service account auth not implemented, use API key",
    );
    return "";
  }
}
