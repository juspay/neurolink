/**
 * Text-to-Speech (TTS) Processing Utility
 *
 * Central orchestrator for all TTS operations across providers.
 * Manages provider-specific TTS handlers and audio generation.
 *
 * @module utils/ttsProcessor
 */

import { logger } from "./logger.js";
import type { TTSHandler } from "../types/ttsTypes.js";

/**
 * TTS processor class for orchestrating text-to-speech operations
 *
 * Follows the same pattern as CSVProcessor, ImageProcessor, and PDFProcessor.
 * Provides a unified interface for TTS generation across multiple providers.
 *
 * @example
 * ```typescript
 * // Register a handler
 * TTSProcessor.registerHandler('google-ai', googleAIHandler);
 *
 * // Check if provider is supported
 * if (TTSProcessor.supports('google-ai')) {
 *   // Provider is registered
 * }
 * ```
 */
export class TTSProcessor {
  /**
   * Handler registry mapping provider names to TTS handlers
   * Uses Map for O(1) lookups and better type safety
   *
   * @private
   */
  private static readonly handlers = new Map<string, TTSHandler>();

  /**
   * Register a TTS handler for a specific provider
   *
   * Allows providers to register their TTS implementation at runtime.
   *
   * @param providerName - Provider identifier (e.g., 'google-ai', 'openai')
   * @param handler - TTS handler implementation
   *
   * @example
   * ```typescript
   * const googleHandler: TTSHandler = {
   *   synthesize: async (text, options) => { ... },
   *   getVoices: async (languageCode) => { ... },
   *   isConfigured: () => true
   * };
   *
   * TTSProcessor.registerHandler('google-ai', googleHandler);
   * ```
   */
  static registerHandler(providerName: string, handler: TTSHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }

    if (!handler) {
      throw new Error("Handler is required");
    }

    const normalizedName = providerName.toLowerCase();

    if (this.handlers.has(normalizedName)) {
      logger.warn(
        `[TTSProcessor] Overwriting existing handler for provider: ${normalizedName}`,
      );
    }

    this.handlers.set(normalizedName, handler);
    logger.debug(
      `[TTSProcessor] Registered TTS handler for provider: ${normalizedName}`,
    );
  }

  /**
   * Get a registered TTS handler by provider name
   *
   * @private
   * @param providerName - Provider identifier
   * @returns Handler instance or undefined if not registered
   */
  private static getHandler(providerName: string): TTSHandler | undefined {
    const normalizedName = providerName.toLowerCase();
    return this.handlers.get(normalizedName);
  }

  /**
   * Check if a provider is supported (has a registered TTS handler)
   *
   * @param providerName - Provider identifier
   * @returns True if handler is registered
   *
   * @example
   * ```typescript
   * if (TTSProcessor.supports('google-ai')) {
   *   console.log('Google AI TTS is supported');
   * }
   * ```
   */
  static supports(providerName: string): boolean {
    if (!providerName) {
      logger.error(
        "[TTSProcessor] Provider name is required for supports check",
      );
      return false;
    }

    const normalizedName = providerName.toLowerCase();
    const isSupported = this.handlers.has(normalizedName);

    if (!isSupported) {
      logger.debug(`[TTSProcessor] Provider ${providerName} is not supported`);
    }

    return isSupported;
  }
}
