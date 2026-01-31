/**
 * Speech-to-Text (STT) Provider Interface and Processor
 *
 * Central orchestrator for all STT operations across providers.
 * Mirrors the pattern of TTSProcessor for consistency.
 *
 * @module voice/STTProvider
 */

import { logger } from "../utils/logger.js";
import type {
  STTOptions,
  STTResult,
  STTLanguage,
  TranscriptionSegment,
  AudioFormat,
} from "./types/voiceTypes.js";
import { STTError } from "./errors.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { STT_ERROR_CODES, DEFAULT_STT_OPTIONS } from "./types/voiceTypes.js";

/**
 * STT Handler interface for provider-specific implementations
 *
 * Each provider (Deepgram, Google, Whisper, etc.) implements this interface
 * to provide STT transcription capabilities using their respective APIs.
 *
 * @example
 * ```typescript
 * class MySTTHandler implements STTHandler {
 *   async transcribe(audio: Buffer, options: STTOptions): Promise<STTResult> {
 *     // Implementation
 *   }
 *
 *   isConfigured(): boolean {
 *     return !!process.env.MY_STT_API_KEY;
 *   }
 * }
 * ```
 */
export interface STTHandler {
  /**
   * Transcribe audio to text using provider-specific STT API
   *
   * @param audio - Audio data as Buffer or ArrayBuffer
   * @param options - STT configuration options (language, format, etc.)
   * @returns Transcription result with text, confidence, and metadata
   * @throws {STTError} On transcription failure, timeout, or configuration issues
   */
  transcribe(audio: Buffer | ArrayBuffer, options: STTOptions): Promise<STTResult>;

  /**
   * Stream transcription for live audio input (optional)
   *
   * @param audioStream - Async iterable of audio chunks
   * @param options - STT configuration options
   * @returns Async iterable of transcription segments
   */
  transcribeStream?(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;

  /**
   * Get supported languages for this provider
   *
   * @returns List of supported language information
   */
  getSupportedLanguages?(): Promise<STTLanguage[]>;

  /**
   * Get supported audio formats for this provider
   *
   * @returns List of supported audio format strings
   */
  getSupportedFormats(): AudioFormat[];

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can transcribe audio
   */
  isConfigured(): boolean;

  /**
   * Maximum audio duration supported in seconds
   * Different providers have different limits
   *
   * @default 3600 (1 hour) if not specified
   */
  maxAudioDuration?: number;

  /**
   * Whether this provider supports streaming transcription
   */
  supportsStreaming?: boolean;
}

/**
 * STT Processor class for orchestrating speech-to-text operations
 *
 * Follows the same pattern as TTSProcessor.
 * Provides a unified interface for STT transcription across multiple providers.
 *
 * @example
 * ```typescript
 * // Register a handler
 * STTProcessor.registerHandler('deepgram', deepgramHandler);
 *
 * // Check if provider is supported
 * if (STTProcessor.supports('deepgram')) {
 *   // Provider is registered
 * }
 *
 * // Transcribe audio
 * const result = await STTProcessor.transcribe(audioBuffer, 'deepgram', {
 *   language: 'en-US',
 *   punctuation: true
 * });
 * ```
 */
export class STTProcessor {
  /**
   * Handler registry mapping provider names to STT handlers
   */
  private static readonly handlers = new Map<string, STTHandler>();

  /**
   * Default maximum audio duration in seconds
   */
  private static readonly DEFAULT_MAX_AUDIO_DURATION = 3600;

  /**
   * Register an STT handler for a specific provider
   *
   * @param providerName - Provider identifier (e.g., 'deepgram', 'whisper')
   * @param handler - STT handler implementation
   */
  static registerHandler(providerName: string, handler: STTHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }

    if (!handler) {
      throw new Error("Handler is required");
    }

    const normalizedName = providerName.toLowerCase();

    if (this.handlers.has(normalizedName)) {
      logger.warn(
        `[STTProcessor] Overwriting existing handler for provider: ${normalizedName}`,
      );
    }

    this.handlers.set(normalizedName, handler);
    logger.debug(
      `[STTProcessor] Registered STT handler for provider: ${normalizedName}`,
    );
  }

  /**
   * Get a registered STT handler by provider name
   */
  private static getHandler(providerName: string): STTHandler | undefined {
    const normalizedName = providerName.toLowerCase();
    return this.handlers.get(normalizedName);
  }

  /**
   * Check if a provider is supported (has a registered STT handler)
   *
   * @param providerName - Provider identifier
   * @returns True if handler is registered
   */
  static supports(providerName: string): boolean {
    if (!providerName) {
      logger.error(
        "[STTProcessor] Provider name is required for supports check",
      );
      return false;
    }

    const normalizedName = providerName.toLowerCase();
    const isSupported = this.handlers.has(normalizedName);

    if (!isSupported) {
      logger.debug(`[STTProcessor] Provider ${providerName} is not supported`);
    }

    return isSupported;
  }

  /**
   * Get list of all registered providers
   *
   * @returns Array of provider names
   */
  static getProviders(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Transcribe audio to text using a registered STT provider
   *
   * Orchestrates the transcription process:
   * 1. Validates input audio (not empty)
   * 2. Looks up the provider handler
   * 3. Verifies provider configuration
   * 4. Validates audio format if supported formats are specified
   * 5. Delegates transcription to the provider
   * 6. Enriches result with metadata
   *
   * @param audio - Audio data to transcribe
   * @param provider - Provider identifier
   * @param options - STT configuration options
   * @returns Transcription result with text and metadata
   * @throws STTError if validation fails or provider not supported/configured
   */
  static async transcribe(
    audio: Buffer | ArrayBuffer,
    provider: string,
    options: STTOptions = {},
  ): Promise<STTResult> {
    const startTime = Date.now();

    // 1. Audio validation: reject empty audio
    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    if (audioBuffer.length === 0) {
      logger.error("[STTProcessor] Audio is empty");
      throw STTError.audioEmpty(provider);
    }

    // 2. Handler lookup
    const handler = this.getHandler(provider);
    if (!handler) {
      logger.error(`[STTProcessor] Provider "${provider}" is not registered`);
      throw STTError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    // 3. Configuration check
    if (!handler.isConfigured()) {
      logger.warn(
        `[STTProcessor] Provider "${provider}" is not properly configured`,
      );
      throw STTError.providerNotConfigured(provider);
    }

    // 4. Format validation if supported formats are specified
    if (options.format) {
      const supportedFormats = handler.getSupportedFormats();
      if (!supportedFormats.includes(options.format)) {
        throw STTError.invalidFormat(options.format, supportedFormats, provider);
      }
    }

    // 5. Merge with default options
    const mergedOptions: STTOptions = {
      ...DEFAULT_STT_OPTIONS,
      ...options,
    };

    try {
      logger.debug(
        `[STTProcessor] Starting transcription with provider: ${provider}`,
      );

      // 6. Call handler.transcribe()
      const result = await handler.transcribe(audioBuffer, mergedOptions);

      // 7. Post-processing: add metadata
      const latency = Date.now() - startTime;
      const enrichedResult: STTResult = {
        ...result,
        metadata: {
          ...result.metadata,
          latency,
          provider,
        },
      };

      logger.info(
        `[STTProcessor] Successfully transcribed audio (${result.text.length} chars, ${latency}ms)`,
      );

      return enrichedResult;
    } catch (err: unknown) {
      // Re-throw STTError as-is
      if (err instanceof STTError) {
        throw err;
      }

      // Wrap other errors in STTError
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      logger.error(
        `[STTProcessor] Transcription failed for provider "${provider}": ${errorMessage}`,
      );
      throw STTError.transcriptionFailed(
        errorMessage,
        provider,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Stream transcription for live audio input
   *
   * @param audioStream - Async iterable of audio chunks
   * @param provider - Provider identifier
   * @param options - STT configuration options
   * @returns Async iterable of transcription segments
   */
  static async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    provider: string,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    const handler = this.getHandler(provider);
    if (!handler) {
      throw STTError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConfigured()) {
      throw STTError.providerNotConfigured(provider);
    }

    if (!handler.transcribeStream || !handler.supportsStreaming) {
      throw new STTError({
        code: STT_ERROR_CODES.STREAM_ERROR,
        message: `Provider "${provider}" does not support streaming transcription`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { provider },
      });
    }

    const mergedOptions: STTOptions = {
      ...DEFAULT_STT_OPTIONS,
      ...options,
    };

    try {
      yield* handler.transcribeStream(audioStream, mergedOptions);
    } catch (err: unknown) {
      if (err instanceof STTError) {
        throw err;
      }
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw STTError.streamError(errorMessage, provider);
    }
  }

  /**
   * Get supported languages for a provider
   *
   * @param provider - Provider identifier
   * @returns List of supported languages
   */
  static async getSupportedLanguages(provider: string): Promise<STTLanguage[]> {
    const handler = this.getHandler(provider);
    if (!handler) {
      throw STTError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.getSupportedLanguages) {
      return [];
    }

    return handler.getSupportedLanguages();
  }

  /**
   * Get supported audio formats for a provider
   *
   * @param provider - Provider identifier
   * @returns List of supported audio formats
   */
  static getSupportedFormats(provider: string): AudioFormat[] {
    const handler = this.getHandler(provider);
    if (!handler) {
      throw STTError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    return handler.getSupportedFormats();
  }

  /**
   * Check if a provider supports streaming
   *
   * @param provider - Provider identifier
   * @returns True if streaming is supported
   */
  static supportsStreaming(provider: string): boolean {
    const handler = this.getHandler(provider);
    if (!handler) {
      return false;
    }
    return handler.supportsStreaming ?? false;
  }

  /**
   * Clear all registered handlers (for testing)
   */
  static clearHandlers(): void {
    this.handlers.clear();
    logger.debug("[STTProcessor] Cleared all handlers");
  }
}
