/**
 * TTS (Text-to-Speech) Processing Utility
 * Provides helper methods for TTS voice discovery and provider capabilities
 */

import { logger } from "./logger.js";

/**
 * Voice option metadata from TTS provider
 */
export interface TTSVoiceOption {
  /** Voice name identifier (e.g., "en-US-Neural2-C") */
  name: string;
  /** Language code (e.g., "en-US") */
  languageCode: string;
  /** Voice gender */
  gender: "MALE" | "FEMALE" | "NEUTRAL";
  /** Voice type/quality tier */
  type: "NEURAL2" | "WAVENET" | "STANDARD";
}

/**
 * TTS provider capabilities
 */
export interface TTSCapabilities {
  /** Whether provider supports TTS */
  supported: boolean;
  /** Supported audio encodings */
  encodings: Array<"MP3" | "WAV" | "OGG">;
  /** Speaking rate range */
  speakingRateRange?: { min: number; max: number };
  /** Pitch adjustment range */
  pitchRange?: { min: number; max: number };
  /** Maximum text length in bytes */
  maxTextBytes?: number;
  /** Authentication method required */
  authMethod?: "api-key" | "service-account" | "none";
}

/**
 * TTS providers that support text-to-speech
 */
const TTS_SUPPORTED_PROVIDERS = [
  "google-ai",
  "vertex",
  "google-ai-studio",
  "gemini",
] as const;
type TTSProvider = (typeof TTS_SUPPORTED_PROVIDERS)[number];

/**
 * Provider-specific TTS capabilities configuration
 */
const PROVIDER_CAPABILITIES: Record<string, TTSCapabilities> = {
  "google-ai": {
    supported: true,
    encodings: ["MP3", "WAV", "OGG"],
    speakingRateRange: { min: 0.25, max: 4.0 },
    pitchRange: { min: -20.0, max: 20.0 },
    maxTextBytes: 5000,
    authMethod: "api-key",
  },
  "google-ai-studio": {
    supported: true,
    encodings: ["MP3", "WAV", "OGG"],
    speakingRateRange: { min: 0.25, max: 4.0 },
    pitchRange: { min: -20.0, max: 20.0 },
    maxTextBytes: 5000,
    authMethod: "api-key",
  },
  gemini: {
    supported: true,
    encodings: ["MP3", "WAV", "OGG"],
    speakingRateRange: { min: 0.25, max: 4.0 },
    pitchRange: { min: -20.0, max: 20.0 },
    maxTextBytes: 5000,
    authMethod: "api-key",
  },
  vertex: {
    supported: true,
    encodings: ["MP3", "WAV", "OGG"],
    speakingRateRange: { min: 0.25, max: 4.0 },
    pitchRange: { min: -20.0, max: 20.0 },
    maxTextBytes: 5000,
    authMethod: "service-account",
  },
};

/**
 * Default capabilities for unsupported providers
 */
const DEFAULT_CAPABILITIES: TTSCapabilities = {
  supported: false,
  encodings: [],
  authMethod: "none",
};

/**
 * TTSProcessor class for TTS-related utilities
 */
export class TTSProcessor {
  /**
   * Get available TTS voices for a provider
   *
   * @param provider - Provider name (e.g., "google-ai", "vertex")
   * @param languageCode - Optional language code filter (e.g., "en-US")
   * @param apiKey - Optional API key for authentication
   * @returns List of available voices
   *
   * @example
   * ```typescript
   * // Get all voices for google-ai
   * const allVoices = await TTSProcessor.getVoices("google-ai");
   *
   * // Get only US English voices
   * const usVoices = await TTSProcessor.getVoices("google-ai", "en-US");
   * ```
   */
  static async getVoices(
    provider: string,
    languageCode?: string,
    apiKey?: string,
  ): Promise<TTSVoiceOption[]> {
    const normalizedProvider = provider.toLowerCase();

    // Check if provider supports TTS
    if (!this.isTTSProvider(normalizedProvider)) {
      logger.warn(
        `[TTSProcessor] Provider '${provider}' does not support TTS. Returning empty voice list.`,
      );
      return [];
    }

    try {
      // Fetch voices from Google Cloud TTS API
      const voices = await this.fetchVoicesFromAPI(normalizedProvider, apiKey);

      // Filter by language code if provided
      if (languageCode) {
        const filtered = voices.filter(
          (voice) => voice.languageCode === languageCode,
        );
        logger.debug(
          `[TTSProcessor] Filtered ${filtered.length} voices for language '${languageCode}' from ${voices.length} total`,
        );
        return filtered;
      }

      logger.debug(`[TTSProcessor] Retrieved ${voices.length} voices`);
      return voices;
    } catch (error) {
      logger.error(
        `[TTSProcessor] Failed to fetch voices for ${provider}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Return empty array on error rather than throwing
      return [];
    }
  }

  /**
   * Get TTS capabilities for a provider
   *
   * @param provider - Provider name (e.g., "google-ai", "vertex")
   * @returns Provider TTS capabilities
   *
   * @example
   * ```typescript
   * const caps = TTSProcessor.getCapabilities("google-ai");
   * if (caps.supported) {
   *   console.log("Supported encodings:", caps.encodings);
   *   console.log("Speaking rate range:", caps.speakingRateRange);
   * }
   * ```
   */
  static getCapabilities(provider: string): TTSCapabilities {
    const normalizedProvider = provider.toLowerCase();

    const capabilities = PROVIDER_CAPABILITIES[normalizedProvider];

    if (!capabilities) {
      logger.debug(
        `[TTSProcessor] Provider '${provider}' not found in capabilities. Returning default (unsupported).`,
      );
      return DEFAULT_CAPABILITIES;
    }

    logger.debug(
      `[TTSProcessor] Retrieved capabilities for ${provider}`,
      capabilities,
    );
    return capabilities;
  }

  /**
   * Check if a provider supports TTS
   *
   * @param provider - Provider name
   * @returns True if provider supports TTS
   */
  private static isTTSProvider(provider: string): boolean {
    return TTS_SUPPORTED_PROVIDERS.includes(provider as TTSProvider);
  }

  /**
   * Fetch voices from Google Cloud TTS API
   *
   * @param provider - Provider name
   * @param apiKey - Optional API key for authentication
   * @returns List of voice options
   */
  private static async fetchVoicesFromAPI(
    provider: string,
    apiKey?: string,
  ): Promise<TTSVoiceOption[]> {
    // Get API key from environment if not provided
    const key =
      apiKey ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    if (
      !key &&
      (provider === "google-ai" ||
        provider === "google-ai-studio" ||
        provider === "gemini")
    ) {
      throw new Error(
        "API key required for google-ai provider. Set GOOGLE_AI_API_KEY environment variable or provide apiKey parameter.",
      );
    }

    try {
      const url = "https://texttospeech.googleapis.com/v1/voices";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authentication based on provider
      if (
        provider === "google-ai" ||
        provider === "google-ai-studio" ||
        provider === "gemini"
      ) {
        headers["X-Goog-Api-Key"] = key;
      } else if (provider === "vertex") {
        // For Vertex AI, service account authentication is required
        // This requires GOOGLE_APPLICATION_CREDENTIALS environment variable
        // For now, we throw an informative error since full vertex auth setup
        // is complex and would require additional dependencies
        throw new Error(
          "Voice discovery for Vertex AI provider requires service account authentication. " +
            "Use google-ai provider for voice discovery, which works with the same voices.",
        );
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        voices: Array<{
          name: string;
          languageCodes: string[];
          ssmlGender: string;
          naturalSampleRateHertz: number;
        }>;
      };

      // Transform API response to our voice format
      const voices: TTSVoiceOption[] = data.voices.map((voice) => {
        const voiceName = voice.name;
        const languageCode = voice.languageCodes[0] || "en-US";

        // Determine voice type from name
        let type: "NEURAL2" | "WAVENET" | "STANDARD" = "STANDARD";
        if (voiceName.includes("Neural2")) {
          type = "NEURAL2";
        } else if (voiceName.includes("Wavenet")) {
          type = "WAVENET";
        }

        // Map SSML gender to our format
        const gender =
          voice.ssmlGender === "MALE"
            ? "MALE"
            : voice.ssmlGender === "FEMALE"
              ? "FEMALE"
              : "NEUTRAL";

        return {
          name: voiceName,
          languageCode,
          gender,
          type,
        };
      });

      return voices;
    } catch (error) {
      logger.error(
        "[TTSProcessor] Error fetching voices from API:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Validate TTS text input
   *
   * @param text - Text to validate
   * @param provider - Provider name
   * @returns True if text is valid
   */
  static validateText(text: string, provider: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const capabilities = this.getCapabilities(provider);
    if (!capabilities.supported) {
      return false;
    }

    if (capabilities.maxTextBytes) {
      const textBytes = new TextEncoder().encode(text).length;
      if (textBytes > capabilities.maxTextBytes) {
        logger.warn(
          `[TTSProcessor] Text exceeds maximum length for ${provider}: ${textBytes} > ${capabilities.maxTextBytes} bytes`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Validate speaking rate
   *
   * @param rate - Speaking rate to validate
   * @param provider - Provider name
   * @returns True if rate is valid
   */
  static validateSpeakingRate(rate: number, provider: string): boolean {
    const capabilities = this.getCapabilities(provider);

    if (!capabilities.speakingRateRange) {
      return true; // No range defined, accept any value
    }

    const { min, max } = capabilities.speakingRateRange;
    return rate >= min && rate <= max;
  }

  /**
   * Validate pitch adjustment
   *
   * @param pitch - Pitch value to validate
   * @param provider - Provider name
   * @returns True if pitch is valid
   */
  static validatePitch(pitch: number, provider: string): boolean {
    const capabilities = this.getCapabilities(provider);

    if (!capabilities.pitchRange) {
      return true; // No range defined, accept any value
    }

    const { min, max } = capabilities.pitchRange;
    return pitch >= min && pitch <= max;
  }
}
