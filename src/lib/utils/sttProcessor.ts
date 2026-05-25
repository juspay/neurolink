/**
 * Speech-to-Text (STT) Processing Utility
 *
 * Central orchestrator for all STT operations across providers.
 * Manages provider-specific STT handlers and audio transcription.
 *
 * @module utils/sttProcessor
 */

import { logger } from "./logger.js";
import type { STTOptions, STTResult, STTHandler } from "../types/index.js";
import { STT_ERROR_CODES } from "../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { STTError } from "../voice/errors.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";

/**
 * STT processor class for orchestrating speech-to-text operations
 *
 * Follows the same pattern as TTSProcessor, CSVProcessor, ImageProcessor, and PDFProcessor.
 * Provides a unified interface for STT transcription across multiple providers.
 *
 * @example
 * ```typescript
 * // Register a handler
 * STTProcessor.registerHandler('whisper', whisperHandler);
 *
 * // Check if provider is supported
 * if (STTProcessor.supports('whisper')) {
 *   // Provider is registered
 * }
 * ```
 */
export class STTProcessor {
  /**
   * Handler registry mapping provider names to STT handlers
   * Uses Map for O(1) lookups and better type safety
   *
   * @private
   */
  private static readonly handlers = new Map<string, STTHandler>();

  /**
   * Default maximum audio duration for STT transcription (in seconds)
   *
   * Providers can override this value by specifying the `maxAudioDuration` property
   * in their respective `STTHandler` implementation. If not specified, this default
   * value will be used (5 minutes).
   *
   * @private
   */
  private static readonly DEFAULT_MAX_AUDIO_DURATION = 300;

  /**
   * Register an STT handler for a specific provider
   *
   * Allows providers to register their STT implementation at runtime.
   *
   * @param providerName - Provider identifier (e.g., 'whisper', 'deepgram')
   * @param handler - STT handler implementation
   *
   * @example
   * ```typescript
   * const whisperHandler: STTHandler = {
   *   transcribe: async (audio, options) => { ... },
   *   getSupportedFormats: () => ["mp3", "wav"],
   *   isConfigured: () => true
   * };
   *
   * STTProcessor.registerHandler('whisper', whisperHandler);
   * ```
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
   * Get a registered STT handler by provider name.
   *
   * Exposed publicly so module-level auto-registration code can reuse an
   * already-registered primary handler when backfilling its aliases.
   *
   * @param providerName - Provider identifier
   * @returns Handler instance or undefined if not registered
   */
  static getHandler(providerName: string): STTHandler | undefined {
    const normalizedName = providerName.toLowerCase();
    return this.handlers.get(normalizedName);
  }

  /**
   * Check if a provider is supported (has a registered STT handler)
   *
   * @param providerName - Provider identifier
   * @returns True if handler is registered
   *
   * @example
   * ```typescript
   * if (STTProcessor.supports('whisper')) {
   *   console.log('Whisper STT is supported');
   * }
   * ```
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
   * Transcribe audio to text using a registered STT provider
   *
   * Orchestrates the speech-to-text transcription process:
   * 1. Validates audio input (non-empty)
   * 2. Looks up the provider handler
   * 3. Verifies provider configuration
   * 4. Delegates transcription to the provider
   * 5. Enriches result with provider metadata
   *
   * @param audio - Audio data as Buffer or ArrayBuffer
   * @param provider - Provider identifier
   * @param options - STT configuration options
   * @returns Transcription result with text and metadata
   * @throws STTError if validation fails or provider not supported/configured
   *
   * @example
   * ```typescript
   * const result = await STTProcessor.transcribe(audioBuffer, "whisper", {
   *   language: "en-US",
   *   punctuation: true,
   * });
   *
   * console.log(`Transcription: ${result.text}`);
   * console.log(`Confidence: ${result.confidence}`);
   * ```
   */
  static async transcribe(
    audio: Buffer | ArrayBuffer,
    provider: string,
    options: STTOptions,
  ): Promise<STTResult> {
    // Create span early so preflight failures are captured
    const span = SpanSerializer.createSpan(SpanType.STT, "stt.transcribe", {
      "stt.operation": "transcribe",
      "stt.provider": provider,
      "stt.language": options.language,
      "stt.format": options.format,
    });

    try {
      // 1. Audio validation: reject empty + oversized audio
      const byteLength =
        audio instanceof ArrayBuffer ? audio.byteLength : audio.length;
      if (!byteLength || byteLength === 0) {
        logger.error("[STTProcessor] Audio data is required for transcription");
        throw new STTError({
          code: STT_ERROR_CODES.AUDIO_EMPTY,
          message: "Audio data is required for STT transcription",
          severity: ErrorSeverity.LOW,
          retriable: false,
          context: { provider },
        });
      }
      // NEW13: enforce a size upper bound so a multi-GB Buffer can't OOM the
      // process. Default 25 MB matches Whisper's documented limit; callers
      // can override via `options.maxAudioBytes`. Permanent errors at the
      // provider level (e.g. Whisper rejecting >25MB) become this clean
      // STTError instead of a memory crash or vendor 413.
      const maxAudioBytes = options.maxAudioBytes ?? 25_000_000;
      if (byteLength > maxAudioBytes) {
        logger.error(
          `[STTProcessor] Audio buffer ${byteLength} bytes exceeds limit ${maxAudioBytes}`,
        );
        throw new STTError({
          code: STT_ERROR_CODES.AUDIO_TOO_LONG,
          message: `Audio buffer ${byteLength} bytes exceeds maximum ${maxAudioBytes} bytes for STT transcription. Increase maxAudioBytes in options or chunk the audio.`,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider, byteLength, maxAudioBytes },
        });
      }

      // 2. Handler lookup and error if provider not supported
      const handler = this.getHandler(provider);
      if (!handler) {
        logger.error(`[STTProcessor] Provider "${provider}" is not registered`);
        throw new STTError({
          code: STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `STT provider "${provider}" is not supported. Use STTProcessor.registerHandler() to register it.`,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: {
            provider,
            availableProviders: Array.from(this.handlers.keys()),
          },
        });
      }

      // 3. Format compatibility check — fail fast when the caller passes
      // an audio format the provider explicitly does not decode (e.g. MP3 to
      // azure-stt). Without this, providers like Azure return a Success
      // response with empty text, which then cascades into a confusing
      // "prompt must be at least 1 character long" failure on the downstream
      // LLM call. We only validate when both `options.format` and
      // `handler.getSupportedFormats()` are present so we never block providers
      // that prefer to do their own detection.
      if (options.format && typeof handler.getSupportedFormats === "function") {
        const supported = handler.getSupportedFormats();
        if (
          Array.isArray(supported) &&
          supported.length > 0 &&
          !supported.includes(options.format)
        ) {
          logger.error(
            `[STTProcessor] Provider "${provider}" does not support audio format "${options.format}"`,
          );
          throw new STTError({
            code: STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
            message: `STT provider "${provider}" does not support audio format "${options.format}". Supported formats: ${supported.join(", ")}.`,
            severity: ErrorSeverity.HIGH,
            retriable: false,
            context: {
              provider,
              requestedFormat: options.format,
              supportedFormats: supported,
            },
          });
        }
      }

      // 4. Configuration check
      if (!handler.isConfigured()) {
        logger.warn(
          `[STTProcessor] Provider "${provider}" is not properly configured`,
        );
        throw new STTError({
          code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `STT provider "${provider}" is not configured. Please set the required API keys.`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      logger.debug(
        `[STTProcessor] Starting transcription with provider: ${provider}`,
      );

      // 5. Call handler.transcribe() - providers handle their own timeouts
      const result = await handler.transcribe(audio, options);

      // 6. Post-processing: enrich result with provider metadata
      const enrichedResult: STTResult = {
        ...result,
        metadata: {
          ...result.metadata,
          provider,
          latency: result.metadata?.latency ?? 0,
        },
      };

      // Don't log transcript content at INFO — voice transcriptions can carry
      // PII / health / financial data, and INFO is typically persisted in
      // production log aggregation (CloudWatch, Datadog, etc.). GDPR / CCPA
      // concern. Length and provider are safe to record.
      logger.debug(
        `[STTProcessor] Transcription completed for provider "${provider}" (${result.text.length} chars)`,
      );

      // 7. Record successful span
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      // 8. Return STTResult with text, confidence, metadata
      return enrichedResult;
    } catch (err: unknown) {
      // Record error span
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(endedSpan);

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
      throw new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: `STT transcription failed for provider "${provider}": ${errorMessage}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: {
          provider,
          audioByteLength:
            audio instanceof ArrayBuffer ? audio.byteLength : audio.length,
          // Sanitize: strip free-text user-supplied fields (e.g. WhisperSTTOptions.prompt)
          // from the error context so error-monitoring pipelines (Sentry, Datadog APM)
          // don't ingest user audio prompt text.
          options: {
            format: options.format,
            language: options.language,
            wordTimestamps: options.wordTimestamps,
            maxAudioBytes: options.maxAudioBytes,
            speakerDiarization: options.speakerDiarization,
          },
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
