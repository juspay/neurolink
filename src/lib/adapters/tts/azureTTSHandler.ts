/**
 * Azure Speech Text-to-Speech Handler
 *
 * Handler for Azure Cognitive Services Speech API integration.
 *
 * @module adapters/tts/azureTTSHandler
 * @see https://docs.microsoft.com/azure/cognitive-services/speech-service/
 */
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { TTSError, TTS_ERROR_CODES } from "../../utils/ttsProcessor.js";
import type { TTSHandler } from "../../utils/ttsProcessor.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../../types/ttsTypes.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";

export class AzureTTSHandler implements TTSHandler {
  private speechConfig: sdk.SpeechConfig | null = null;

  /**
   * Azure Speech Service maximum input size.
   * Azure supports up to ~10MB of text, but we set a reasonable limit here.
   */
  private static readonly DEFAULT_MAX_TEXT_LENGTH = 10000;

  /**
   * Maximum text length supported by Azure Speech Service (in bytes).
   *
   * NOTE:
   * Validation against this limit is performed by the shared TTS processor
   * before invoking provider handlers, not inside this class.
   */
  public readonly maxTextLength: number =
    AzureTTSHandler.DEFAULT_MAX_TEXT_LENGTH;

  /**
   * Create a new Azure TTS Handler
   *
   * @param key - Optional Azure Speech Service subscription key (defaults to AZURE_SPEECH_KEY env var)
   * @param region - Optional Azure Speech Service region (defaults to AZURE_SPEECH_REGION env var)
   */
  constructor(key?: string, region?: string) {
    const subscriptionKey = key ?? process.env.AZURE_SPEECH_KEY;
    const serviceRegion = region ?? process.env.AZURE_SPEECH_REGION;

    if (subscriptionKey && serviceRegion) {
      try {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(
          subscriptionKey,
          serviceRegion,
        );
        logger.debug(
          `[AzureTTSHandler] Initialized with region: ${serviceRegion}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logger.error(
          `[AzureTTSHandler] Failed to initialize SpeechConfig: ${message}`,
        );
        this.speechConfig = null;
      }
    } else {
      logger.warn(
        "[AzureTTSHandler] Azure Speech Service credentials not provided. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.",
      );
    }
  }

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can generate TTS
   */
  isConfigured(): boolean {
    return this.speechConfig !== null;
  }

  /**
   * Get available voices for the provider
   *
   * @param languageCode - Optional language filter (e.g., "en-US")
   * @returns List of available voices
   */
  async getVoices(languageCode?: string): Promise<TTSVoice[]> {
    if (!this.speechConfig) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Azure Speech Service not initialized. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION or pass credentials to constructor.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    throw new TTSError({
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: "getVoices method not implemented yet",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { languageCode },
    });
  }

  /**
   * Generate audio from text using provider-specific TTS API
   *
   * @param text - Text or SSML to convert to speech
   * @param options - TTS configuration options
   * @returns Audio buffer with metadata
   */
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.speechConfig) {
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message:
          "Azure Speech Service not initialized. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION or pass credentials to constructor.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
      });
    }

    throw new TTSError({
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: "synthesize method not implemented yet",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { textLength: text.length, options },
    });
  }
}
