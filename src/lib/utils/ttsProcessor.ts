/**
 * Text-to-Speech (TTS) Processing Utility
 *
 * Central orchestrator for all TTS operations across providers.
 * Manages provider-specific TTS handlers and audio generation.
 *
 * @module utils/ttsProcessor
 */

import { logger } from "./logger.js";
import type { TTSOptions, TTSResult, TTSVoice } from "../types/ttsTypes.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "./errorHandling.js";

/**
 * TTS-specific error codes
 */
export const TTS_ERROR_CODES = {
  EMPTY_TEXT: "TTS_EMPTY_TEXT",
  TEXT_TOO_LONG: "TTS_TEXT_TOO_LONG",
  PROVIDER_NOT_SUPPORTED: "TTS_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "TTS_PROVIDER_NOT_CONFIGURED",
  SYNTHESIS_FAILED: "TTS_SYNTHESIS_FAILED",
  INVALID_INPUT: "TTS_INVALID_INPUT",
} as const;

/**
 * TTS Error class for text-to-speech specific errors
 */
export class TTSError extends NeuroLinkError {
  constructor(options: {
    code: string;
    message: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    retriable?: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    super({
      code: options.code,
      message: options.message,
      category: options.category ?? ErrorCategory.VALIDATION,
      severity: options.severity ?? ErrorSeverity.MEDIUM,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "TTSError";
  }
}

/**
 * TTS Handler interface for provider-specific implementations
 *
 * Each provider (Google AI, OpenAI, etc.) implements this interface
 * to provide TTS generation capabilities using their respective APIs.
 *
 * **Timeout Handling:**
 * Implementations MUST handle their own timeouts for the `synthesize()` method.
 * Recommended timeout: 30 seconds. Implementations should use `withTimeout()` utility
 * or provider-specific timeout mechanisms (e.g., Google Cloud client timeout).
 *
 * **Error Handling:**
 * Implementations should throw TTSError for all failures, including timeouts.
 * Use appropriate error codes from TTS_ERROR_CODES.
 *
 * @example
 * ```typescript
 * class MyTTSHandler implements TTSHandler {
 *   async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
 *     // REQUIRED: Implement timeout handling
 *     return await withTimeout(
 *       this.actualSynthesis(text, options),
 *       30000, // 30 second timeout
 *       'TTS synthesis timed out'
 *     );
 *   }
 *
 *   isConfigured(): boolean {
 *     return !!process.env.MY_TTS_API_KEY;
 *   }
 * }
 * ```
 */
export type TTSHandler = {
  /**
   * Generate audio from text using provider-specific TTS API
   *
   * **IMPORTANT: Timeout Responsibility**
   * Implementations MUST enforce their own timeouts (recommended: 30 seconds).
   * Use the `withTimeout()` utility or provider-specific timeout mechanisms.
   *
   * @param text - Text to convert to speech (pre-validated, non-empty, within length limits)
   * @param options - TTS configuration options (voice, format, speed, etc.)
   * @returns Audio buffer with metadata
   * @throws {TTSError} On synthesis failure, timeout, or configuration issues
   */
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;

  /**
   * Get available voices for the provider
   *
   * @param languageCode - Optional language filter (e.g., "en-US")
   * @returns List of available voices
   */
  getVoices?(languageCode?: string): Promise<TTSVoice[]>;

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can generate TTS
   */
  isConfigured(): boolean;

  /**
   * Maximum text length supported by this provider (in bytes)
   * Different providers have different limits
   *
   * @default 3000 if not specified
   */
  maxTextLength?: number;
};

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
   * Default maximum text length for TTS synthesis (in bytes)
   *
   * Providers can override this value by specifying the `maxTextLength` property
   * in their respective `TTSHandler` implementation. If not specified, this default
   * value will be used.
   *
   * @private
   */
  private static readonly DEFAULT_MAX_TEXT_LENGTH = 3000;

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

  /**
   * Synthesize speech from text using a registered TTS provider
   *
   * Orchestrates the text-to-speech generation process:
   * 1. Validates input text (not empty, within length limits)
   * 2. Looks up the provider handler
   * 3. Verifies provider configuration
   * 4. Delegates synthesis to the provider (timeout handled by provider)
   * 5. Enriches result with metadata
   *
   * **Timeout Handling:**
   * Timeouts are enforced by individual provider implementations (see TTSHandler interface).
   * Providers typically use 30-second timeouts via `withTimeout()` utility or
   * provider-specific timeout mechanisms (e.g., Google Cloud client timeout).
   *
   * @param text - Text to convert to speech
   * @param provider - Provider identifier
   * @param options - TTS configuration options
   * @returns Audio result with buffer and metadata
   * @throws TTSError if validation fails or provider not supported/configured
   *
   * @example
   * ```typescript
   * const result = await TTSProcessor.synthesize("Hello, world!", "google-ai", {
   *   voice: "en-US-Neural2-C",
   *   format: "mp3",
   *   speed: 1.0
   * });
   *
   * console.log(`Generated ${result.size} bytes of ${result.format} audio`);
   * // Save to file or play the audio buffer
   * ```
   */
  static async synthesize(
    text: string,
    provider: string,
    options: TTSOptions,
  ): Promise<TTSResult> {
    // Trim the text once at the start
    const trimmedText = text.trim();

    // 1. Text validation: reject empty text
    if (!trimmedText) {
      logger.error("[TTSProcessor] Text is required for synthesis");
      throw new TTSError({
        code: TTS_ERROR_CODES.EMPTY_TEXT,
        message: "Text is required for TTS synthesis",
        severity: ErrorSeverity.LOW,
        retriable: false,
        context: { provider },
      });
    }

    // 2. Handler lookup and error if provider not supported
    const handler = this.getHandler(provider);
    if (!handler) {
      logger.error(`[TTSProcessor] Provider "${provider}" is not registered`);
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        message: `TTS provider "${provider}" is not supported. Use TTSProcessor.registerHandler() to register it.`,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: {
          provider,
          availableProviders: Array.from(this.handlers.keys()),
        },
      });
    }

    // 3. Text validation: reject text exceeding provider-specific max length
    const maxTextLength = handler.maxTextLength ?? this.DEFAULT_MAX_TEXT_LENGTH;
    if (trimmedText.length > maxTextLength) {
      logger.error(
        `[TTSProcessor] Text exceeds maximum length of ${maxTextLength} characters for provider "${provider}"`,
      );
      throw new TTSError({
        code: TTS_ERROR_CODES.TEXT_TOO_LONG,
        message: `Text length (${trimmedText.length}) exceeds maximum allowed length (${maxTextLength} characters) for provider "${provider}"`,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: {
          provider,
          textLength: trimmedText.length,
          maxLength: maxTextLength,
        },
      });
    }

    // 4. Configuration check
    if (!handler.isConfigured()) {
      logger.warn(
        `[TTSProcessor] Provider "${provider}" is not properly configured`,
      );
      throw new TTSError({
        code: TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: `TTS provider "${provider}" is not configured. Please set the required API keys.`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider },
      });
    }

    try {
      logger.debug(
        `[TTSProcessor] Starting synthesis with provider: ${provider}`,
      );

      // 5. Call handler.synthesize() - providers handle their own timeouts
      const result = await handler.synthesize(trimmedText, options);

      // 6. Post-processing: add metadata
      const enrichedResult: TTSResult = {
        ...result,
        voice: result.voice ?? options.voice,
      };

      logger.info(
        `[TTSProcessor] Successfully synthesized ${result.size} bytes of audio`,
      );

      // 7. Returns TTSResult with buffer, format, metadata
      return enrichedResult;
    } catch (err: unknown) {
      // 8. Comprehensive error handling
      // Re-throw TTSError as-is
      if (err instanceof TTSError) {
        throw err;
      }

      // Wrap other errors in TTSError
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(
        `[TTSProcessor] Synthesis failed for provider "${provider}": ${errorMessage}`,
      );
      throw new TTSError({
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: `TTS synthesis failed for provider "${provider}": ${errorMessage}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: {
          provider,
          textLength: trimmedText.length,
          options,
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
