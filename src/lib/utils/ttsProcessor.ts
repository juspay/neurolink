/**
 * Text-to-Speech (TTS) Processor
 *
 * This module provides the main TTS synthesis orchestration logic.
 * It handles text validation, provider lookup, and audio generation.
 *
 * @module utils/ttsProcessor
 */

import { logger } from "./logger.js";
import type {
  TTSOptions,
  TTSResult,
  TTSHandler,
  TTSSynthesizeOptions,
} from "../types/ttsTypes.js";
import { TTSError, TTSErrorCode } from "../types/ttsTypes.js";

/**
 * Maximum text length in bytes for TTS synthesis
 * Google Cloud TTS API has a 5000 byte limit
 */
const MAX_TEXT_LENGTH_BYTES = 5000;

/**
 * TTSProcessor orchestrates text-to-speech synthesis
 *
 * Responsibilities:
 * - Text validation (empty text, length limits)
 * - Handler lookup based on provider
 * - Delegation to provider-specific handlers
 * - Post-processing and metadata enrichment
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * const processor = new TTSProcessor();
 * processor.registerHandler('google-ai', googleAIHandler);
 *
 * const result = await processor.synthesize({
 *   text: 'Hello, world!',
 *   provider: 'google-ai',
 *   options: {
 *     voice: 'en-US-Neural2-C',
 *     format: 'mp3',
 *     speed: 1.0
 *   }
 * });
 * ```
 */
export class TTSProcessor {
  private handlers: Map<string, TTSHandler> = new Map();

  /**
   * Register a TTS handler for a specific provider
   *
   * @param providerName - Name of the provider (e.g., 'google-ai', 'vertex')
   * @param handler - The handler implementation
   */
  registerHandler(providerName: string, handler: TTSHandler): void {
    logger.debug(`Registering TTS handler for provider: ${providerName}`);
    this.handlers.set(providerName.toLowerCase(), handler);
  }

  /**
   * Unregister a TTS handler
   *
   * @param providerName - Name of the provider to unregister
   */
  unregisterHandler(providerName: string): void {
    logger.debug(`Unregistering TTS handler for provider: ${providerName}`);
    this.handlers.delete(providerName.toLowerCase());
  }

  /**
   * Get a registered handler by provider name
   *
   * @param providerName - Name of the provider
   * @returns The handler if found, undefined otherwise
   */
  getHandler(providerName: string): TTSHandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
  }

  /**
   * Main synthesis method that orchestrates text-to-speech conversion
   *
   * This method performs the following steps:
   * 1. Validates the input text (not empty, within length limits)
   * 2. Looks up the appropriate handler for the provider
   * 3. Delegates to the handler's synthesize method
   * 4. Adds metadata to the result
   * 5. Handles errors comprehensively
   *
   * @param synthesizeOptions - Synthesis configuration
   * @returns Promise resolving to TTS result with audio buffer and metadata
   * @throws {TTSError} If validation fails or handler not found
   */
  async synthesize(
    synthesizeOptions: TTSSynthesizeOptions,
  ): Promise<TTSResult> {
    const { text, provider, options } = synthesizeOptions;

    try {
      // Step 1: Validate text input
      this.validateText(text);

      // Step 2: Lookup handler
      const handler = this.getHandler(provider);
      if (!handler) {
        const errorMessage = `TTS handler not found for provider: ${provider}`;
        logger.error(errorMessage, {
          provider,
          availableProviders: Array.from(this.handlers.keys()),
        });
        throw new TTSError(
          errorMessage,
          TTSErrorCode.HANDLER_NOT_FOUND,
          provider,
        );
      }

      logger.info(`Starting TTS synthesis with provider: ${provider}`, {
        textLength: text.length,
        voice: options.voice,
        format: options.format,
      });

      // Step 3: Call handler synthesize
      const result = await handler.synthesize(text, options);

      // Step 4: Post-processing - add metadata
      const enrichedResult = this.addMetadata(result, text, options);

      logger.info("TTS synthesis completed successfully", {
        provider,
        size: enrichedResult.size,
        format: enrichedResult.format,
        voice: enrichedResult.voice,
      });

      return enrichedResult;
    } catch (error) {
      // Step 5: Comprehensive error handling
      if (error instanceof TTSError) {
        // Re-throw TTS-specific errors
        throw error;
      }

      // Wrap other errors as synthesis failures
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("TTS synthesis failed", {
        provider,
        error: errorMessage,
        textLength: text.length,
      });

      throw new TTSError(
        `Synthesis failed: ${errorMessage}`,
        TTSErrorCode.SYNTHESIS_FAILED,
        provider,
      );
    }
  }

  /**
   * Validate text input
   *
   * Checks:
   * - Text is not empty or whitespace only
   * - Text does not exceed maximum byte length
   *
   * @param text - The text to validate
   * @throws {TTSError} If validation fails
   */
  private validateText(text: string): void {
    // Check for empty text
    if (!text || text.trim().length === 0) {
      logger.warn("TTS synthesis rejected: empty text provided");
      throw new TTSError(
        "Text is required for TTS synthesis",
        TTSErrorCode.INVALID_TEXT,
      );
    }

    // Check text length in bytes (Google TTS API limit is 5000 bytes)
    const textBytes = new TextEncoder().encode(text).length;
    if (textBytes > MAX_TEXT_LENGTH_BYTES) {
      logger.warn("TTS synthesis rejected: text exceeds maximum length", {
        textBytes,
        maxBytes: MAX_TEXT_LENGTH_BYTES,
      });
      throw new TTSError(
        `Text exceeds maximum length of ${MAX_TEXT_LENGTH_BYTES} bytes (got ${textBytes} bytes)`,
        TTSErrorCode.TEXT_TOO_LONG,
      );
    }
  }

  /**
   * Add metadata to the TTS result
   *
   * Enriches the result with additional information such as:
   * - Voice used for generation
   * - Original text length
   * - Generation timestamp
   *
   * @param result - The base TTS result from the handler
   * @param text - The original input text
   * @param options - The TTS options used
   * @returns Enriched TTS result with metadata
   */
  private addMetadata(
    result: TTSResult,
    text: string,
    options: TTSOptions,
  ): TTSResult {
    // Add voice to result if not already present
    const voice = result.voice || options.voice;

    // Return enriched result
    return {
      ...result,
      voice,
    };
  }

  /**
   * Get list of registered providers
   *
   * @returns Array of provider names that have registered handlers
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a provider has a registered handler
   *
   * @param providerName - Name of the provider to check
   * @returns True if handler is registered, false otherwise
   */
  hasHandler(providerName: string): boolean {
    return this.handlers.has(providerName.toLowerCase());
  }
}
