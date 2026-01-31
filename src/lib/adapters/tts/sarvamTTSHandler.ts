/**
 * Sarvam AI Text-to-Speech Handler
 *
 * Handler for Sarvam AI TTS API integration.
 * Sarvam provides high-quality Indian language TTS.
 *
 * @module adapters/tts/sarvamTTSHandler
 * @see https://docs.sarvam.ai/
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import type { TTSProvider, VoiceCapability } from "../../types/voiceTypes.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * Sarvam supported languages
 */
export type SarvamLanguage =
  | "hi-IN" // Hindi
  | "bn-IN" // Bengali
  | "kn-IN" // Kannada
  | "ml-IN" // Malayalam
  | "mr-IN" // Marathi
  | "od-IN" // Odia
  | "pa-IN" // Punjabi
  | "ta-IN" // Tamil
  | "te-IN" // Telugu
  | "en-IN" // Indian English
  | "gu-IN"; // Gujarati

/**
 * Sarvam TTS model options
 */
export type SarvamTTSModel = "bulbul:v1";

/**
 * Sarvam speaker options by language
 */
export type SarvamSpeaker =
  | "meera" // Hindi female
  | "pavithra" // Tamil female
  | "maitreyi" // Kannada female
  | "arvind" // Hindi male
  | "amol" // Marathi male
  | "amartya"; // Bengali male

/**
 * Sarvam-specific TTS options
 */
export type SarvamTTSOptions = TTSOptions & {
  /** Sarvam TTS model */
  model?: SarvamTTSModel;
  /** Speaker voice */
  speaker?: SarvamSpeaker;
  /** Target language for the output */
  targetLanguageCode?: SarvamLanguage;
  /** Enable pitch control (-10 to 10) */
  pitch?: number;
  /** Enable pace control (0.5 to 2.0) */
  pace?: number;
  /** Enable loudness control */
  loudness?: number;
  /** Enable speech synthesis markup */
  enablePreprocessing?: boolean;
};

/**
 * Sarvam API response type
 */
type SarvamTTSResponse = {
  audios: string[]; // Base64 encoded audio
  request_id?: string;
};

/**
 * Sarvam AI Text-to-Speech Handler
 *
 * Specializes in Indian language TTS with high-quality neural voices.
 *
 * @example
 * ```typescript
 * const handler = new SarvamTTSHandler();
 *
 * const result = await handler.synthesize("नमस्ते, आप कैसे हैं?", {
 *   voice: "meera",
 *   format: "wav",
 * });
 * ```
 */
export class SarvamTTSHandler implements TTSHandler, TTSProvider {
  readonly name = "sarvam";
  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  /**
   * Sarvam TTS maximum text length
   */
  public readonly maxTextLength = 5000;

  /**
   * Predefined Sarvam voices
   */
  private static readonly VOICES: TTSVoice[] = [
    {
      id: "meera",
      name: "Meera",
      languageCode: "hi-IN",
      languageCodes: ["hi-IN"],
      gender: "female",
      type: "neural",
      description: "Hindi female voice - warm and natural",
    },
    {
      id: "pavithra",
      name: "Pavithra",
      languageCode: "ta-IN",
      languageCodes: ["ta-IN"],
      gender: "female",
      type: "neural",
      description: "Tamil female voice",
    },
    {
      id: "maitreyi",
      name: "Maitreyi",
      languageCode: "kn-IN",
      languageCodes: ["kn-IN"],
      gender: "female",
      type: "neural",
      description: "Kannada female voice",
    },
    {
      id: "arvind",
      name: "Arvind",
      languageCode: "hi-IN",
      languageCodes: ["hi-IN"],
      gender: "male",
      type: "neural",
      description: "Hindi male voice - professional and clear",
    },
    {
      id: "amol",
      name: "Amol",
      languageCode: "mr-IN",
      languageCodes: ["mr-IN"],
      gender: "male",
      type: "neural",
      description: "Marathi male voice",
    },
    {
      id: "amartya",
      name: "Amartya",
      languageCode: "bn-IN",
      languageCodes: ["bn-IN"],
      gender: "male",
      type: "neural",
      description: "Bengali male voice",
    },
  ];

  /**
   * Language to default speaker mapping
   */
  private static readonly LANGUAGE_SPEAKERS: Record<string, SarvamSpeaker> = {
    "hi-IN": "meera",
    "ta-IN": "pavithra",
    "kn-IN": "maitreyi",
    "mr-IN": "amol",
    "bn-IN": "amartya",
  };

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? process.env.SARVAM_API_KEY ?? null;
    this.baseUrl = baseUrl ?? "https://api.sarvam.ai";
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
      return { valid: false, errors: ["SARVAM_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get available voices
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (languageCode) {
      return SarvamTTSHandler.VOICES.filter(
        (v) =>
          v.languageCode === languageCode ||
          v.languageCode.startsWith(languageCode.split("-")[0] ?? ""),
      );
    }
    return SarvamTTSHandler.VOICES;
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Sarvam API key not configured. Set SARVAM_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const sarvamOptions = options as SarvamTTSOptions;

    // Determine speaker and language
    const speaker = this.resolveVoice(options.voice, sarvamOptions);
    const targetLanguageCode =
      sarvamOptions.targetLanguageCode ??
      this.getLanguageForSpeaker(speaker) ??
      "hi-IN";

    try {
      const requestBody: Record<string, unknown> = {
        inputs: [text],
        target_language_code: targetLanguageCode,
        speaker: speaker,
        model: sarvamOptions.model ?? "bulbul:v1",
      };

      // Add optional parameters
      if (sarvamOptions.pitch !== undefined) {
        requestBody.pitch = Math.max(-10, Math.min(10, sarvamOptions.pitch));
      }
      if (sarvamOptions.pace !== undefined) {
        requestBody.pace = Math.max(0.5, Math.min(2.0, sarvamOptions.pace));
      }
      if (sarvamOptions.loudness !== undefined) {
        requestBody.loudness = sarvamOptions.loudness;
      }
      if (sarvamOptions.enablePreprocessing !== undefined) {
        requestBody.enable_preprocessing = sarvamOptions.enablePreprocessing;
      }

      const response = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: "POST",
        headers: {
          "API-Subscription-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Sarvam TTS failed: ${response.status} - ${errorText}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const data = (await response.json()) as SarvamTTSResponse;
      const latency = Date.now() - startTime;

      if (!data.audios || data.audios.length === 0) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Sarvam TTS returned no audio data",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      // Sarvam returns WAV audio as base64
      const audioBase64 = data.audios[0];
      if (!audioBase64) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: "Sarvam TTS returned empty audio",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
        });
      }

      const buffer = Buffer.from(audioBase64, "base64");

      return {
        buffer,
        format: "wav", // Sarvam returns WAV
        size: buffer.length,
        voice: speaker,
        metadata: {
          latency,
          provider: "sarvam",
          model: sarvamOptions.model ?? "bulbul:v1",
          language: targetLanguageCode,
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
        message: `Sarvam TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { latency },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Resolve voice/speaker from options
   */
  private resolveVoice(
    voice: string | undefined,
    options: SarvamTTSOptions,
  ): SarvamSpeaker {
    // If speaker explicitly provided
    if (options.speaker) {
      return options.speaker;
    }

    // If voice ID provided, use it directly
    if (voice && this.isValidSpeaker(voice)) {
      return voice as SarvamSpeaker;
    }

    // If target language provided, use default speaker for that language
    if (options.targetLanguageCode) {
      const defaultSpeaker =
        SarvamTTSHandler.LANGUAGE_SPEAKERS[options.targetLanguageCode];
      if (defaultSpeaker) {
        return defaultSpeaker;
      }
    }

    // Default to Hindi female voice
    return "meera";
  }

  /**
   * Check if a string is a valid Sarvam speaker
   */
  private isValidSpeaker(value: string): boolean {
    const validSpeakers = [
      "meera",
      "pavithra",
      "maitreyi",
      "arvind",
      "amol",
      "amartya",
    ];
    return validSpeakers.includes(value);
  }

  /**
   * Get language code for a speaker
   */
  private getLanguageForSpeaker(speaker: SarvamSpeaker): SarvamLanguage | null {
    const voiceInfo = SarvamTTSHandler.VOICES.find((v) => v.id === speaker);
    return (voiceInfo?.languageCode as SarvamLanguage) ?? null;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): SarvamLanguage[] {
    return [
      "hi-IN",
      "bn-IN",
      "kn-IN",
      "ml-IN",
      "mr-IN",
      "od-IN",
      "pa-IN",
      "ta-IN",
      "te-IN",
      "en-IN",
      "gu-IN",
    ];
  }
}
