/**
 * Text-to-Speech (TTS) Processing Utility
 *
 * Central orchestrator for all TTS operations across providers.
 * Manages provider-specific TTS handlers and audio generation.
 *
 * @module utils/ttsProcessor
 */

import { logger } from "./logger.js";
import type {
  TTSChunk,
  TTSOptions,
  TTSResult,
  TTSHandler,
} from "../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "./errorHandling.js";
import { HandlerRegistry } from "../core/handlerRegistry.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
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

const DEFAULT_STREAMING_BUFFER_SIZE = 120;
const SENTENCE_BOUNDARY = /[.!?]+(?:["')\]]+)?(?=\s|$)/g;

/** Internal signal raised after all buffered segments have been attempted. */
export class IncrementalTTSSynthesisError extends Error {
  readonly firstError: unknown;
  readonly failedSegments: readonly number[];

  constructor(firstError: unknown, failedSegments: number[]) {
    super(
      `Incremental TTS failed for ${failedSegments.length} segment${failedSegments.length === 1 ? "" : "s"}`,
    );
    this.name = "IncrementalTTSSynthesisError";
    this.firstError = firstError;
    this.failedSegments = [...failedSegments];
  }
}

function findSentenceEnds(text: string): number[] {
  const ends: number[] = [];
  for (const match of text.matchAll(SENTENCE_BOUNDARY)) {
    ends.push((match.index ?? 0) + match[0].length);
  }
  return ends;
}

const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;
const LOW_SURROGATE_START = 0xdc00;
const LOW_SURROGATE_END = 0xdfff;

/**
 * Move a split index off the middle of a surrogate pair.
 *
 * The cap is measured in UTF-16 code units, so a hard split can land between
 * the two halves of an astral character (emoji, rarer CJK). That would end one
 * segment with a lone high surrogate and start the next with its low half, and
 * providers receive U+FFFD instead of the character. Backing the split off by
 * one code unit keeps the pair whole in the next segment.
 *
 * A split at index 1 is left alone: backing off would yield an empty segment
 * with an unchanged remainder, and a cap that small cannot hold the pair anyway.
 */
function avoidSurrogateSplit(text: string, splitAt: number): number {
  if (splitAt <= 1 || splitAt >= text.length) {
    return splitAt;
  }
  const high = text.charCodeAt(splitAt - 1);
  const low = text.charCodeAt(splitAt);
  const splitsPair =
    high >= HIGH_SURROGATE_START &&
    high <= HIGH_SURROGATE_END &&
    low >= LOW_SURROGATE_START &&
    low <= LOW_SURROGATE_END;
  return splitsPair ? splitAt - 1 : splitAt;
}

function takeBufferedSegment(
  buffer: string,
  flushBoundary: number,
  maxTextLength: number,
  inputComplete: boolean,
): { segment: string; remainder: string } | undefined {
  const cappedText = buffer.slice(0, maxTextLength);
  const sentenceEnds = findSentenceEnds(cappedText);
  let splitAt =
    buffer.length >= flushBoundary ? sentenceEnds.at(-1) : undefined;

  if (splitAt === undefined && buffer.length >= maxTextLength) {
    splitAt = sentenceEnds.at(-1) ?? maxTextLength;
  }

  if (splitAt === undefined && inputComplete && buffer.trim()) {
    splitAt = Math.min(buffer.length, maxTextLength);
  }

  if (splitAt === undefined) {
    return undefined;
  }

  splitAt = avoidSurrogateSplit(buffer, splitAt);

  const segment = buffer.slice(0, splitAt).trim();
  const remainder = buffer.slice(splitAt).trimStart();
  if (!segment) {
    return { segment: "", remainder };
  }
  return { segment, remainder };
}

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
   *
   * @private
   */
  private static readonly registry = new HandlerRegistry<TTSHandler>(
    "TTSProcessor",
  );

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
    const normalizedName = providerName
      ? providerName.toLowerCase()
      : providerName;
    this.registry.register(providerName, handler);
    logger.debug(
      `[TTSProcessor] Registered TTS handler for provider: ${normalizedName}`,
    );
  }

  /**
   * Get a registered TTS handler by provider name.
   *
   * Exposed publicly so module-level auto-registration code can reuse an
   * already-registered primary handler when backfilling its aliases —
   * see `src/lib/voice/index.ts:registerDefaultTTSHandlers`.
   *
   * @param providerName - Provider identifier
   * @returns Handler instance or undefined if not registered
   */
  static getHandler(providerName: string): TTSHandler | undefined {
    return this.registry.get(providerName);
  }

  /**
   * List the names of all registered providers.
   */
  static listProviders(): string[] {
    return this.registry.list();
  }

  /**
   * Removes every registered TTS handler. Primarily for test isolation —
   * production code should not need to call this.
   */
  static clearHandlers(): void {
    this.registry.clear();
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

    const isSupported = this.registry.supports(providerName);

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
    // Create span early so preflight failures are captured
    const span = SpanSerializer.createSpan(SpanType.TTS, "tts.synthesize", {
      "tts.operation": "synthesize",
      "tts.provider": provider,
      "tts.voice": options.voice,
      "tts.format": options.format,
    });

    try {
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
            availableProviders: this.registry.list(),
          },
        });
      }

      // 3. Text validation: reject text exceeding provider-specific max length
      const maxTextLength =
        handler.maxTextLength ?? this.DEFAULT_MAX_TEXT_LENGTH;
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

      // 7. Record successful span
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      // 8. Returns TTSResult with buffer, format, metadata
      return enrichedResult;
    } catch (err: unknown) {
      // Record error span
      const endedSpan = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(endedSpan);

      // 9. Comprehensive error handling
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
          textLength: text.trim().length,
          options,
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Incrementally synthesize sentence-buffered text chunks.
   *
   * Text is flushed at a sentence boundary after `streamingBufferSize`
   * characters, or hard-split before the provider's maximum text length.
   * Each segment goes through `synthesize()`, preserving the existing handler
   * registry, validation, error normalization, and telemetry seam.
   *
   * The most recent successful audio chunk is held until another succeeds or
   * the input ends, so exactly one real audio chunk carries `isFinal: true`
   * without emitting a separate empty terminator chunk.
   */
  static async *synthesizeStream(
    textChunks: AsyncIterable<string>,
    provider: string,
    options: TTSOptions,
    shouldStop?: () => boolean,
  ): AsyncGenerator<TTSChunk> {
    const handler = this.getHandler(provider);
    const maxTextLength = Math.max(
      1,
      handler?.maxTextLength ?? this.DEFAULT_MAX_TEXT_LENGTH,
    );
    const requestedBoundary =
      options.streamingBufferSize ?? DEFAULT_STREAMING_BUFFER_SIZE;
    const flushBoundary = Math.min(
      Math.max(1, Math.trunc(requestedBoundary)),
      maxTextLength,
    );
    let buffer = "";
    let chunkIndex = 0;
    let cumulativeSize = 0;
    let cumulativeDuration = 0;
    let pendingChunk: TTSChunk | undefined;
    let segmentNumber = 0;
    let firstFailure: unknown;
    const failedSegments: number[] = [];

    const synthesizeSegment = async (
      segment: string,
    ): Promise<TTSChunk | undefined> => {
      const currentSegment = ++segmentNumber;
      try {
        const result = await this.synthesize(segment, provider, options);
        cumulativeSize += result.size;
        cumulativeDuration += result.duration ?? 0;
        return {
          data: result.buffer,
          format: result.format,
          index: chunkIndex++,
          isFinal: false,
          cumulativeSize,
          estimatedDuration: cumulativeDuration || undefined,
          voice: result.voice,
          sampleRate: result.sampleRate,
        };
      } catch (error) {
        if (failedSegments.length === 0) {
          firstFailure = error;
        }
        failedSegments.push(currentSegment);
        logger.warn(
          `[TTSProcessor] Incremental synthesis skipped a buffered segment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return undefined;
      }
    };

    for await (const textChunk of textChunks) {
      if (shouldStop?.()) {
        break;
      }
      buffer += textChunk;

      while (!shouldStop?.()) {
        const buffered = takeBufferedSegment(
          buffer,
          flushBoundary,
          maxTextLength,
          false,
        );
        if (!buffered) {
          break;
        }
        buffer = buffered.remainder;
        if (!buffered.segment) {
          continue;
        }

        const chunk = await synthesizeSegment(buffered.segment);
        if (chunk) {
          if (pendingChunk) {
            yield pendingChunk;
          }
          pendingChunk = chunk;
        }
      }
    }

    while (!shouldStop?.()) {
      const buffered = takeBufferedSegment(
        buffer,
        flushBoundary,
        maxTextLength,
        true,
      );
      if (!buffered) {
        break;
      }
      buffer = buffered.remainder;
      if (!buffered.segment) {
        continue;
      }

      const chunk = await synthesizeSegment(buffered.segment);
      if (chunk) {
        if (pendingChunk) {
          yield pendingChunk;
        }
        pendingChunk = chunk;
      }
    }

    if (pendingChunk) {
      yield { ...pendingChunk, isFinal: true };
    }
    if (failedSegments.length > 0) {
      throw new IncrementalTTSSynthesisError(firstFailure, failedSegments);
    }
  }
}
