/**
 * Azure Cognitive Services Text-to-Speech Handler
 *
 * Handler for Azure Speech Services TTS API integration.
 * Supports SSML input and streaming synthesis.
 *
 * @module adapters/tts/azureTTSHandler
 * @see https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
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
 * Azure Speech-specific options
 */
export type AzureTTSOptions = TTSOptions & {
  /** Azure Speech region */
  region?: string;
  /** Output audio format */
  outputFormat?: string;
  /** SSML input (overrides text) */
  ssml?: string;
};

/**
 * Azure Cognitive Services Speech-to-Text Handler
 *
 * @example
 * ```typescript
 * const handler = new AzureTTSHandler();
 *
 * const result = await handler.synthesize("Hello, world!", {
 *   voice: "en-US-JennyNeural",
 *   format: "mp3",
 * });
 * ```
 */
export class AzureTTSHandler implements TTSHandler, TTSProvider {
  readonly name = "azure-tts";
  private readonly subscriptionKey: string | null;
  private readonly region: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  public readonly maxTextLength = 10000; // Azure supports up to ~10KB

  constructor(subscriptionKey?: string, region?: string) {
    this.subscriptionKey =
      subscriptionKey ?? process.env.AZURE_SPEECH_KEY ?? null;
    this.region = region ?? process.env.AZURE_SPEECH_REGION ?? "eastus";
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
    return this.subscriptionKey !== null;
  }

  /**
   * Validate provider configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.subscriptionKey) {
      return { valid: false, errors: ["AZURE_SPEECH_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Get available voices from Azure
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.subscriptionKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech subscription key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < AzureTTSHandler.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
      const response = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Azure voices API error: ${response.status}`);
      }

      const data = (await response.json()) as Array<{
        ShortName: string;
        DisplayName: string;
        LocalName: string;
        Locale: string;
        Gender: string;
        VoiceType: string;
      }>;

      const voices: TTSVoice[] = data.map((v) => ({
        id: v.ShortName,
        name: v.DisplayName,
        languageCode: v.Locale,
        languageCodes: [v.Locale],
        gender: this.mapGender(v.Gender),
        type: v.VoiceType.toLowerCase().includes("neural")
          ? "neural"
          : "standard",
        description: v.LocalName,
      }));

      const filteredVoices = languageCode
        ? voices.filter((v) => v.languageCode.startsWith(languageCode))
        : voices;

      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return filteredVoices;
    } catch (err) {
      logger.error("Failed to fetch Azure voices:", err);
      return [];
    }
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.subscriptionKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech key not configured. Set AZURE_SPEECH_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const azureOptions = options as AzureTTSOptions;
    const voice = options.voice ?? "en-US-JennyNeural";
    const outputFormat = this.getOutputFormat(options.format ?? "mp3");

    // Build SSML
    const ssml = azureOptions.ssml ?? this.buildSSML(text, voice, options);

    try {
      const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": outputFormat,
        },
        body: ssml,
      });

      if (!response.ok) {
        throw new TTSError({
          code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
          message: `Azure TTS failed: ${response.status}`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: response.status >= 500,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const latency = Date.now() - startTime;

      return {
        buffer,
        format: options.format ?? "mp3",
        size: buffer.length,
        voice,
        metadata: {
          latency,
          provider: "azure",
          region: this.region,
        },
      };
    } catch (err) {
      if (err instanceof TTSError) {
        throw err;
      }

      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Azure TTS failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
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
    if (!this.subscriptionKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const azureOptions = options as AzureTTSOptions;
    const voice = options.voice ?? "en-US-JennyNeural";
    const outputFormat = this.getOutputFormat(options.format ?? "mp3");
    const ssml = azureOptions.ssml ?? this.buildSSML(text, voice, options);

    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": outputFormat,
      },
      body: ssml,
    });

    if (!response.ok || !response.body) {
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `Azure TTS streaming failed: ${response.status}`,
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

  private buildSSML(text: string, voice: string, options: TTSOptions): string {
    const rate =
      options.speed !== undefined
        ? `${Math.round(options.speed * 100)}%`
        : "default";
    const pitch =
      options.pitch !== undefined
        ? `${options.pitch > 0 ? "+" : ""}${options.pitch}Hz`
        : "default";

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voice}">
        <prosody rate="${rate}" pitch="${pitch}">
          ${this.escapeXml(text)}
        </prosody>
      </voice>
    </speak>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private getOutputFormat(format: string): string {
    switch (format) {
      case "mp3":
        return "audio-24khz-160kbitrate-mono-mp3";
      case "wav":
        return "riff-24khz-16bit-mono-pcm";
      case "ogg":
        return "ogg-24khz-16bit-mono-opus";
      default:
        return "audio-24khz-160kbitrate-mono-mp3";
    }
  }

  private mapGender(gender: string): Gender {
    const g = gender.toLowerCase();
    if (g === "male") {
      return "male";
    }
    if (g === "female") {
      return "female";
    }
    return "neutral";
  }
}
