/**
 * Azure Cognitive Services Text-to-Speech Handler
 *
 * Implementation of TTS using Azure Speech Services.
 *
 * @module voice/providers/AzureTTS
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  AudioFormat,
  AzureTTSOptions,
  AzureVoiceInfo,
  TTSHandler,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { TTS_ERROR_CODES, TTSError } from "../../utils/ttsProcessor.js";

/**
 * Azure Cognitive Services Text-to-Speech Handler
 *
 * Supports neural voices with SSML and custom voice styles.
 *
 * @see https://docs.microsoft.com/azure/cognitive-services/speech-service/
 */
export class AzureTTS implements TTSHandler {
  private readonly apiKey: string | null;
  private readonly region: string;
  private voicesCache: { voices: TTSVoice[]; timestamp: number } | null = null;
  private static readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Maximum text length (10000 characters for Azure)
   */
  public readonly maxTextLength = 10000;

  constructor(apiKey?: string, region?: string) {
    this.apiKey = apiKey ?? process.env.AZURE_SPEECH_KEY ?? null;
    this.region = region ?? process.env.AZURE_SPEECH_REGION ?? "eastus";
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    // Return cached voices if valid
    if (
      this.voicesCache &&
      Date.now() - this.voicesCache.timestamp < AzureTTS.CACHE_TTL_MS &&
      !languageCode
    ) {
      return this.voicesCache.voices;
    }

    try {
      const voicesController = new AbortController();
      const voicesTimeoutId = setTimeout(() => voicesController.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(
          `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
          {
            method: "GET",
            headers: {
              "Ocp-Apim-Subscription-Key": this.apiKey,
            },
            signal: voicesController.signal,
          },
        );
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "Azure TTS voices request timed out after 30 seconds",
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.MEDIUM,
            retriable: true,
            originalError: fetchErr,
          });
        }
        throw fetchErr;
      } finally {
        clearTimeout(voicesTimeoutId);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as AzureVoiceInfo[];

      let voices: TTSVoice[] = data.map((voice) => ({
        id: voice.ShortName,
        name: voice.DisplayName,
        languageCode: voice.Locale,
        languageCodes: [voice.Locale],
        gender: this.mapGender(voice.Gender),
        type: voice.VoiceType.toLowerCase().includes("neural")
          ? "neural"
          : "standard",
        description: voice.LocaleName,
      }));

      // Filter by language if specified
      if (languageCode) {
        voices = voices.filter(
          (v) =>
            v.languageCode
              .toLowerCase()
              .startsWith(languageCode.toLowerCase()) ||
            v.languageCode.toLowerCase() === languageCode.toLowerCase(),
        );
      }

      // Cache full list
      if (!languageCode) {
        this.voicesCache = { voices, timestamp: Date.now() };
      }

      return voices;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[AzureTTSHandler] Failed to get voices: ${errorMessage}`);
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
    if (!this.apiKey) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Azure Speech key not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    const startTime = Date.now();
    const azureOptions = options as AzureTTSOptions;

    try {
      // Get voice (default to a common neural voice)
      const voice = options.voice ?? "en-US-JennyNeural";

      // Determine output format
      const outputFormat =
        azureOptions.outputFormat ?? this.mapFormat(options.format ?? "mp3");

      // Build SSML
      const ssml = this.buildSSML(text, voice, options);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch(
          `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
          {
            method: "POST",
            headers: {
              "Ocp-Apim-Subscription-Key": this.apiKey,
              "Content-Type": "application/ssml+xml",
              "X-Microsoft-OutputFormat": outputFormat,
            },
            body: ssml,
            signal: controller.signal,
          },
        );
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new TTSError({
            code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
            message: "Azure TTS request timed out after 30 seconds",
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.HIGH,
            retriable: true,
            originalError: fetchErr,
          });
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const latency = Date.now() - startTime;

      // Get audio buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const result: TTSResult = {
        buffer: audioBuffer,
        format: options.format ?? "mp3",
        size: audioBuffer.length,
        voice,
        sampleRate: this.getSampleRate(outputFormat),
        metadata: {
          latency,
          provider: "azure-tts",
          outputFormat,
          region: this.region,
        },
      };

      logger.info(
        `[AzureTTSHandler] Synthesized ${audioBuffer.length} bytes in ${latency}ms`,
      );

      return result;
    } catch (err: unknown) {
      if (err instanceof TTSError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(`[AzureTTSHandler] Synthesis failed: ${errorMessage}`);
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
   * Build SSML from text and options
   */
  private buildSSML(text: string, voice: string, options: TTSOptions): string {
    const azureOptions = options as AzureTTSOptions;

    // If custom SSML template provided, use it
    if (azureOptions.ssmlTemplate) {
      return azureOptions.ssmlTemplate
        .replace("{text}", this.escapeXml(text))
        .replace("{voice}", this.escapeXml(voice));
    }

    // Check if text is already SSML
    if (text.trim().startsWith("<speak")) {
      return text;
    }

    // Build rate string
    const rate = options.speed
      ? `${Math.round((options.speed - 1) * 100)}%`
      : "0%";

    // Build pitch string
    const pitch = options.pitch ? `${Math.round(options.pitch)}%` : "0%";

    // Build SSML
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.escapeXml(this.extractLanguage(voice))}">
  <voice name="${this.escapeXml(voice)}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${this.escapeXml(text)}
    </prosody>
  </voice>
</speak>`;
  }

  /**
   * Extract language from voice name
   */
  private extractLanguage(voice: string): string {
    // Voice names are like "en-US-JennyNeural"
    const match = voice.match(/^([a-z]{2}-[A-Z]{2})/);
    return match ? match[1] : "en-US";
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Map gender string to standard type
   */
  private mapGender(gender: string): "male" | "female" | "neutral" {
    switch (gender?.toLowerCase()) {
      case "male":
        return "male";
      case "female":
        return "female";
      default:
        return "neutral";
    }
  }

  /**
   * Map AudioFormat to Azure output format
   */
  private mapFormat(format: AudioFormat): string {
    const formats: Partial<Record<AudioFormat, string>> = {
      mp3: "audio-24khz-96kbitrate-mono-mp3",
      wav: "riff-24khz-16bit-mono-pcm",
      ogg: "ogg-24khz-16bit-mono-opus",
      opus: "ogg-24khz-16bit-mono-opus",
    };
    return formats[format] ?? "audio-24khz-96kbitrate-mono-mp3";
  }

  /**
   * Get sample rate from format string
   */
  private getSampleRate(format: string): number {
    if (format.includes("24khz")) {
      return 24000;
    }
    if (format.includes("16khz")) {
      return 16000;
    }
    if (format.includes("48khz")) {
      return 48000;
    }
    return 24000;
  }
}
