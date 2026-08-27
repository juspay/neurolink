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
  TTSAudioFormat,
  TTSChunk,
  TTSOptions,
  TTSResult,
  TTSHandler,
} from "../types/index.js";
import { VALID_AUDIO_FORMATS } from "../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "./errorHandling.js";
import { HandlerRegistry } from "../core/handlerRegistry.js";
import {
  attachStreamCancel,
  cancelStream,
  releaseIterator,
} from "./streamCancellation.js";
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

/**
 * Converts an arbitrary thrown value to a loggable string without running
 * code the value controls unguarded: `.message` can be a throwing accessor,
 * and `String()` can hit a hostile `toString`/`Symbol.toPrimitive` or a
 * null-prototype object. A logging or normalization path must never become
 * a new way for a handler to break the stream.
 */
function safeErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return String(error.message);
    }
    return String(error);
  } catch {
    return "[unprintable error]";
  }
}

/**
 * `instanceof` is not a safe question to ask of a value a provider threw.
 * The check performs a prototype lookup, and a `Proxy` with a throwing
 * `getPrototypeOf` trap — or a revoked one — detonates on it, which turns the
 * classification itself into a second way for a handler to break the stream.
 * A value that will not answer the question is not the class being asked about.
 */
function safeInstanceOf<T>(
  value: unknown,
  ctor: abstract new (...args: never[]) => T,
): value is T {
  try {
    return value instanceof ctor;
  } catch {
    return false;
  }
}

/**
 * Reduce a caught value to an `Error` that is safe to hand onwards as
 * `originalError`.
 *
 * `NeuroLinkError`'s constructor reads `.stack` and `.message` off that option
 * without guarding them, so an `Error` carrying a throwing accessor detonates
 * *inside* the shaper — from within the `catch` that exists to contain it,
 * where nothing re-catches it. Forwarding is therefore conditional on the
 * reads succeeding here, where a throw is contained; anything that fails is
 * replaced by a plain carrier holding the already-safe message and owning no
 * accessors of its own. Shared error infrastructure is left exactly as it is:
 * the TTS boundary owes it a value it has proven safe.
 */
function toSafeOriginalError(
  error: unknown,
  safeMessage: string,
): Error | undefined {
  if (!safeInstanceOf(error, Error)) {
    return undefined;
  }
  try {
    // Exactly the reads the structured-error constructor performs, forced
    // here rather than discovered there.
    String(error.name);
    String(error.message);
    String(error.stack);
    return error;
  } catch {
    return new Error(safeMessage);
  }
}

/**
 * A value may pass `safeInstanceOf` by LYING — a `Proxy` whose
 * `getPrototypeOf` answers `TTSError.prototype` while every `get` detonates.
 * Passing one through as "already shaped" hands the hostile value to every
 * downstream consumer. Trust the claim only when the reads those consumers
 * perform succeed here, where a throw is contained.
 */
function isReadableTTSError(value: unknown): value is TTSError {
  if (!safeInstanceOf(value, TTSError)) {
    return false;
  }
  try {
    String(value.name);
    String(value.message);
    String(value.code);
    void value.retriable;
    String(value.stack);
    return true;
  } catch {
    return false;
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
 * Build the shaped error, retrying without the original if attaching it
 * throws.
 *
 * `toSafeOriginalError` proves the reads succeed, but a one-shot accessor can
 * answer one way when it is checked and another when the structured-error
 * constructor reads it. Nothing about a caught value is worth losing the
 * shaped failure over, so the retry drops it and keeps the code, the
 * provider-qualified message and the `retriable` flag.
 */
function buildTTSError(
  details: ConstructorParameters<typeof TTSError>[0],
  originalError: Error | undefined,
): TTSError {
  try {
    return new TTSError({ ...details, originalError });
  } catch {
    return new TTSError(details);
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
        safeErrorMessage(err),
      );
      getMetricsAggregator().recordSpan(endedSpan);

      // 9. Comprehensive error handling
      throw this.toSynthesisError(err, provider, text, options);
    }
  }

  /**
   * Normalize a provider failure into the public `TTSError` shape.
   *
   * Extracted from `synthesize()` so the native streaming path can shape its
   * transport errors identically. A raw provider error reaching the public
   * surface unwrapped loses `retriable` (and the provider-qualified message),
   * which is exactly what a caller keying retry logic off
   * `ttsMetadata.error.retriable` reads.
   */
  private static toSynthesisError(
    error: unknown,
    provider: string,
    text: string,
    options: TTSOptions,
  ): TTSError {
    // Already-structured errors pass through untouched. Guarded because this
    // is the first thing done with a value the provider chose: a proxy that
    // traps its prototype lookup used to fail the whole shaper right here,
    // costing the segment its `retriable` flag.
    if (isReadableTTSError(error)) {
      return error;
    }

    const errorMessage = error ? safeErrorMessage(error) : "Unknown error";
    logger.error(
      `[TTSProcessor] Synthesis failed for provider "${provider}": ${errorMessage}`,
    );
    return buildTTSError(
      {
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
      },
      toSafeOriginalError(error, errorMessage),
    );
  }

  /**
   * Open the `tts.synthesize` span that `synthesize()` opens, so a segment
   * served by a handler's native stream emits the same telemetry a buffered
   * segment does.
   */
  private static startSynthesisSpan(
    provider: string,
    options: TTSOptions,
  ): ReturnType<typeof SpanSerializer.createSpan> {
    return SpanSerializer.createSpan(SpanType.TTS, "tts.synthesize", {
      "tts.operation": "synthesize",
      "tts.provider": provider,
      "tts.voice": options.voice,
      "tts.format": options.format,
    });
  }

  private static finishSynthesisSpan(
    span: ReturnType<typeof SpanSerializer.createSpan>,
    status: SpanStatus,
    message?: string,
  ): void {
    getMetricsAggregator().recordSpan(
      SpanSerializer.endSpan(span, status, message),
    );
  }

  /**
   * `TTSHandler.synthesizeStream` is declared `unknown`, so a handler may
   * carry anything at all under that name — including a legacy member of an
   * unrelated shape. The native capability is discovered structurally instead:
   * the member must be callable, and what it returns must be async-iterable.
   *
   * Discovery reads consumer-controlled properties, and a property read can
   * itself execute user code (a Proxy trap, a throwing getter) — the member on
   * the handler and the well-known symbol on what it returns alike. Every one
   * of those reads therefore happens inside a try: `resolveNativeStream`
   * guards the whole preflight in one region, and `cancelStream`/
   * `releaseIterator` in `streamCancellation.ts` guard the symbol read they
   * each perform on the unwind path.
   */
  private static isCallableMember(
    value: unknown,
  ): value is (...args: unknown[]) => unknown {
    return typeof value === "function";
  }

  private static isNativeStream(
    value: unknown,
  ): value is AsyncIterable<unknown> {
    if (
      value === null ||
      (typeof value !== "object" && typeof value !== "function")
    ) {
      return false;
    }
    const iterable = value as { [Symbol.asyncIterator]?: unknown };
    return typeof iterable[Symbol.asyncIterator] === "function";
  }

  /**
   * Coerce one fragment yielded by a handler's native stream into the fields
   * this processor forwards, or `undefined` when the fragment is not audio.
   *
   * `TTSHandler.synthesizeStream` is declared `unknown` because ANY narrower
   * type rejects some existing consumer that already carries a member of that
   * name — a Critical Rule 5 break. The type therefore checks nothing at all,
   * and every check happens at runtime instead. Here that means: a
   * fragment must carry a non-empty binary payload, and a reported `format` is
   * honoured only when it names a real audio format, falling back to the
   * requested one. The caller skips an `undefined` result exactly as it skips
   * a zero-length transport read.
   */
  private static normalizeNativeChunk(
    fragment: unknown,
    options: TTSOptions,
  ):
    | {
        data: Buffer;
        format: TTSAudioFormat;
        voice?: string;
        sampleRate?: number;
        estimatedDuration?: number;
      }
    | undefined {
    if (fragment === null || typeof fragment !== "object") {
      return undefined;
    }
    const candidate = fragment as {
      data?: unknown;
      format?: unknown;
      voice?: unknown;
      sampleRate?: unknown;
      estimatedDuration?: unknown;
    };
    const payload = candidate.data;
    let data: Buffer;
    if (Buffer.isBuffer(payload)) {
      data = payload;
    } else if (payload instanceof Uint8Array) {
      data = Buffer.from(
        payload.buffer,
        payload.byteOffset,
        payload.byteLength,
      );
    } else {
      return undefined;
    }
    // A zero-length transport read is not audio. Emitting it would put an
    // empty chunk in front of the consumer and repeat `cumulativeSize`.
    if (data.length === 0) {
      return undefined;
    }
    const format =
      typeof candidate.format === "string" &&
      VALID_AUDIO_FORMATS.includes(candidate.format as TTSAudioFormat)
        ? (candidate.format as TTSAudioFormat)
        : (options.format ?? "mp3");
    return {
      data,
      format,
      voice: typeof candidate.voice === "string" ? candidate.voice : undefined,
      sampleRate:
        typeof candidate.sampleRate === "number"
          ? candidate.sampleRate
          : undefined,
      estimatedDuration:
        typeof candidate.estimatedDuration === "number"
          ? candidate.estimatedDuration
          : undefined,
    };
  }

  /**
   * Ask a handler for a native stream for one segment, or `undefined` to serve
   * the segment from `synthesize()`.
   *
   * `undefined` is the documented "not incrementally deliverable" signal. A
   * handler that throws instead, or hands back something that is not
   * async-iterable, is buggy — but that is a reason to serve the segment from
   * the buffered path, not to lose it.
   *
   * **Every failure this method anticipates answers `undefined` instead of
   * throwing, and the caller's catch backstops what no code that must
   * describe a hostile thrown value can rule out.** Everything it does is a question ABOUT the
   * handler, asked before any of the segment's work has begun, and every one
   * of those questions can run consumer code: reading `synthesizeStream` or
   * `isConfigured` can hit an accessor or a `Proxy` trap, calling
   * `isConfigured()` and calling the member run handler code outright, and
   * reading `Symbol.asyncIterator` off whatever comes back can hit a getter or
   * a trap of its own. A throw from ANY of them means the same thing — the
   * capability could not be established — so they all sit inside the single
   * guarded region below and every failure answers `undefined`. The segment
   * then goes to `synthesize()`, which re-runs the identical preflight inside
   * its own `tts.synthesize` span and normalizes whatever it raises, exactly
   * as it did before native streaming existed. Reporting a preflight failure
   * from here instead would open a second span for one segment, or drop a
   * segment the buffered path can still serve.
   *
   * Two ordering rules make that equivalence exact:
   *
   * - The member is read FIRST and exactly ONCE per segment. An accessor-
   *   defined member runs consumer code on every read, so a second read can
   *   answer differently from the one that was tested — and reading it before
   *   `isConfigured()` keeps a handler that does not offer the capability at
   *   all on precisely the call sequence it had before this method existed.
   * - `isConfigured()` runs only once a callable member has been found, which
   *   is the only case where this method is about to invoke the handler.
   *
   * The one measured departure from `origin/release` is a call count, not an
   * outcome: a segment that starts down the native path and falls back calls
   * the handler's `isConfigured()` twice — here, and again inside
   * `synthesize()`. That is inherent to attempting native delivery at all and
   * predates this method's current shape; `isConfigured()` is specified as a
   * configuration predicate, and for any implementation that behaves as one —
   * a pure predicate — every observable of such a segment (chunks, spans,
   * error code and `retriable`) is identical either way. A handler whose
   * answer CHANGES between the two calls changes the outcome with it: the
   * second answer, taken on the path that actually synthesizes, decides.
   */
  private static resolveNativeStream(
    handler: TTSHandler,
    provider: string,
    segment: string,
    options: TTSOptions,
  ): AsyncIterable<unknown> | undefined {
    try {
      const member = handler.synthesizeStream;
      if (!this.isCallableMember(member)) {
        // The member is declared `unknown`, so a handler may carry a legacy
        // value of any shape under this name. Only a callable one can be the
        // native capability; anything else means this handler simply does not
        // offer it, and the segment belongs on the buffered path.
        return undefined;
      }
      if (!handler.isConfigured()) {
        // Deliberately not reported here. `synthesize()` runs the same check
        // inside its own span and raises the same
        // `TTS_PROVIDER_NOT_CONFIGURED` error, which is what this segment got
        // before native streaming existed.
        return undefined;
      }
      const candidate = member.call(handler, segment, options);
      if (candidate === undefined) {
        return undefined;
      }
      // The well-known-symbol READ lives inside this try alongside the call:
      // it can execute user code (a throwing getter, a Proxy trap) exactly as
      // the call can, and losing every segment to a bad read is precisely
      // what this fallback exists to prevent.
      if (this.isNativeStream(candidate)) {
        return candidate;
      }
    } catch (nativeSetupError) {
      logger.warn(
        `[TTSProcessor] Provider "${provider}" threw while establishing synthesizeStream(); using buffered synthesis for this segment: ${safeErrorMessage(
          nativeSetupError,
        )}`,
      );
      return undefined;
    }
    logger.warn(
      `[TTSProcessor] Provider "${provider}" returned a non-iterable from synthesizeStream(); using buffered synthesis for this segment.`,
    );
    return undefined;
  }

  /**
   * Incrementally synthesize sentence-buffered text chunks.
   *
   * Text is flushed at a sentence boundary after `streamingBufferSize`
   * characters, or hard-split before the provider's maximum text length.
   *
   * A segment is served by the handler's `synthesizeStream()` when it offers
   * one and returns a stream, and by `synthesize()` otherwise — including
   * when the native stream produces no deliverable audio at all, and including
   * every way capability discovery itself can fail. The preflight reads and
   * calls that decide whether a native stream exists all sit inside one
   * guarded region in `resolveNativeStream`, with the call site's own catch
   * backstopping it, so a handler that misbehaves while being ASKED lands on
   * the buffered path rather than costing the segment. That is what makes the
   * next sentence true of every segment rather than only of the ones that got
   * that far.
   *
   * Either way the segment keeps the same handler registry, validation, error
   * normalization and `tts.synthesize` telemetry seam — exactly one span per
   * segment, opened by whichever path served it — cancellation included: a
   * segment whose stream is still in flight when the consumer stops records
   * its span from the unwind path rather than dropping it. Failures that
   * originate in the native segment's own work, once a stream has been
   * established, are a different case and keep the shaped failed-segment
   * semantics every synthesis failure has.
   *
   * Provider-reported indexes, cumulative sizes and finality are discarded and
   * recomputed globally. A native fragment is dropped unless it carries a
   * non-empty binary payload, so no native read reaches the consumer as an
   * empty chunk; the buffered path is unfiltered and forwards whatever
   * `synthesize()` returns, so a handler that produces a zero-byte buffer
   * still yields an empty chunk and a repeated `cumulativeSize`. The most
   * recent successful audio chunk is held until another succeeds or the input
   * ends, so exactly one real audio chunk carries `isFinal: true` without
   * emitting a separate empty terminator chunk.
   *
   * Segment production and per-segment synthesis are deliberately inline
   * rather than nested async generators: each additional generator layer costs
   * every chunk several microtask turns, which is directly observable at
   * `NeuroLink.stream()` as audio interleaving one text chunk later than it
   * does without native streaming.
   */
  static synthesizeStream(
    textChunks: AsyncIterable<string>,
    provider: string,
    options: TTSOptions,
    shouldStop?: () => boolean,
  ): AsyncGenerator<TTSChunk> {
    const processor = this;
    let cancelled = false;
    let activeNativeStream: AsyncIterable<unknown> | undefined;
    let activeNativeIterator: AsyncIterator<unknown> | undefined;
    const stopped = (): boolean => cancelled || shouldStop?.() === true;

    const stream = (async function* (): AsyncGenerator<TTSChunk> {
      const handler = processor.getHandler(provider);
      const maxTextLength = Math.max(
        1,
        handler?.maxTextLength ?? processor.DEFAULT_MAX_TEXT_LENGTH,
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
      let inputComplete = false;

      const textIterator = textChunks[Symbol.asyncIterator]();
      let textExhausted = false;

      /**
       * The next flushable segment, or `undefined` when more text is needed
       * (or, once the input is complete, when the buffer is drained).
       */
      const takeSegment = (): string | undefined => {
        for (;;) {
          const buffered = takeBufferedSegment(
            buffer,
            flushBoundary,
            maxTextLength,
            inputComplete,
          );
          if (!buffered) {
            return undefined;
          }
          buffer = buffered.remainder;
          if (buffered.segment) {
            return buffered.segment;
          }
        }
      };

      /**
       * Read one segment's audio from a handler's native stream.
       *
       * Only NATIVE segments pay for this extra generator layer. The buffered
       * path stays inline in the loop below, which is what keeps its chunks
       * interleaving where they did before native streaming existed.
       *
       * Sets `outcome.fellBackToBuffered` when the stream completed without a
       * single deliverable fragment, which is the caller's signal to serve the
       * segment from `synthesize()` after all.
       */
      const readNativeSegment = async function* (
        nativeStream: AsyncIterable<unknown>,
        segment: string,
        outcome: { fellBackToBuffered: boolean },
      ): AsyncGenerator<TTSChunk> {
        const span = processor.startSynthesisSpan(provider, options);
        let spanSettled = false;
        const settleSpan = (status: SpanStatus, message?: string): void => {
          if (spanSettled) {
            return;
          }
          spanSettled = true;
          processor.finishSynthesisSpan(span, status, message);
        };
        let nativeComplete = false;
        let emitted = 0;
        try {
          activeNativeStream = nativeStream;
          activeNativeIterator = nativeStream[Symbol.asyncIterator]();
          while (!stopped()) {
            const result = await activeNativeIterator.next();
            if (result.done) {
              nativeComplete = true;
              break;
            }
            const fragment = processor.normalizeNativeChunk(
              result.value,
              options,
            );
            // Not audio — an empty read, or a fragment carrying no binary
            // payload at all. Emitting it would put an empty chunk in front of
            // the consumer and repeat `cumulativeSize`.
            if (!fragment) {
              continue;
            }
            cumulativeSize += fragment.data.length;
            cumulativeDuration += fragment.estimatedDuration ?? 0;
            emitted += 1;
            yield {
              data: fragment.data,
              format: fragment.format,
              index: chunkIndex++,
              isFinal: false,
              cumulativeSize,
              estimatedDuration: cumulativeDuration || undefined,
              voice: fragment.voice ?? options.voice,
              sampleRate: fragment.sampleRate,
            };
          }
          if (emitted === 0 && !stopped()) {
            // The native stream ran to completion without producing a single
            // deliverable byte. Treating that as a successful segment yields
            // no chunk at all — no audio, no final chunk, and no error to
            // explain it. Serve the segment from the buffered path instead,
            // which is what this method did before native streaming existed.
            // The span is deliberately left unrecorded: `synthesize()` opens
            // its own, and one segment must not report two.
            outcome.fellBackToBuffered = true;
            logger.warn(
              `[TTSProcessor] Provider "${provider}" produced no audio from synthesizeStream(); falling back to buffered synthesis for this segment.`,
            );
          }
        } catch (nativeError) {
          settleSpan(SpanStatus.ERROR, safeErrorMessage(nativeError));
          // Shape the transport failure exactly as the buffered path does, so
          // `ttsMetadata.error` keeps its code, message prefix and `retriable`
          // flag whichever path served the segment.
          throw processor.toSynthesisError(
            nativeError,
            provider,
            segment,
            options,
          );
        } finally {
          const iterator = activeNativeIterator;
          activeNativeIterator = undefined;
          activeNativeStream = undefined;
          if (!nativeComplete && iterator) {
            if (stopped()) {
              cancelStream(nativeStream);
            }
            releaseIterator(iterator);
          }
          if (!outcome.fellBackToBuffered) {
            // Also reached when the consumer stops mid-segment: that resumes
            // this generator with a `return` completion at the `yield` above,
            // so the normal-completion path never runs. The provider still did
            // real work and delivered bytes, and the buffered path records a
            // span for the same user action — closing it here is what keeps
            // the two at parity.
            settleSpan(SpanStatus.OK);
          }
        }
      };

      /**
       * Record one segment's synthesis failure.
       *
       * Gated on our OWN teardown flag, never on `stopped()`: cancelling this
       * stream makes an in-flight transport reject, and that rejection is not
       * a segment failure. A caller-driven `shouldStop()` is a different thing
       * entirely, and suppressing here for it erased genuine failures that
       * were reported before native streaming existed.
       */
      const recordSegmentFailure = (
        segmentNo: number,
        error: unknown,
      ): void => {
        if (cancelled) {
          return;
        }
        if (failedSegments.length === 0) {
          firstFailure = error;
        }
        failedSegments.push(segmentNo);
        logger.warn(
          `[TTSProcessor] Incremental synthesis skipped a buffered segment: ${safeErrorMessage(
            error,
          )}`,
        );
      };

      try {
        while (!stopped()) {
          const segment = takeSegment();
          if (segment === undefined) {
            if (inputComplete) {
              break;
            }
            const next = await textIterator.next();
            if (next.done) {
              textExhausted = true;
              inputComplete = true;
            } else {
              buffer += next.value;
            }
            continue;
          }

          const currentSegment = ++segmentNumber;

          // NOTHING BELOW MAY `yield` INSIDE A `try` THAT HAS A `catch`.
          // A consumer can resume this generator with `AsyncGenerator.throw()`
          // while it is suspended at a `yield`; the injected error surfaces AT
          // the yield expression. If a segment `catch` were in scope there, it
          // would swallow the consumer's own error and report it as a provider
          // segment failure — re-delivering the parked chunk, dropping a
          // segment, and finally raising a fabricated
          // `IncrementalTTSSynthesisError` attributed to the provider. Before
          // this loop was flattened the yields sat outside every try and the
          // error propagated, which is the behaviour callers still get.
          // Segment work is wrapped; the yields are not.

          // Capability discovery is delegated whole. There is deliberately no
          // `handler.synthesizeStream` truthiness gate here: that gate was a
          // SECOND read of an untrusted member on every segment, so an
          // accessor-defined member ran consumer code twice and the value that
          // was tested need not be the value that was called.
          // `resolveNativeStream` performs the one read, inside its guard.
          let nativeStream: AsyncIterable<unknown> | undefined;
          try {
            nativeStream = handler
              ? processor.resolveNativeStream(
                  handler,
                  provider,
                  segment,
                  options,
                )
              : undefined;
          } catch (discoveryError) {
            // Rarely reached — `resolveNativeStream` answers `undefined` for
            // every failure it anticipates — but a sufficiently hostile
            // thrown value can escape any code that must describe it, and
            // the disposition here is what matters when one does.
            // Discovery asks about the handler; it never does the segment's
            // work, so a failure here means "no native capability", not "no
            // audio". Losing the segment to it is the defect this branch has
            // now been refuted for twice.
            logger.warn(
              `[TTSProcessor] Provider "${provider}" threw during native capability discovery; using buffered synthesis for this segment: ${safeErrorMessage(
                discoveryError,
              )}`,
            );
            nativeStream = undefined;
          }

          if (nativeStream) {
            const outcome = { fellBackToBuffered: false };
            const native = readNativeSegment(nativeStream, segment, outcome);
            let nativeDone = false;
            let nativeFailed = false;
            try {
              for (;;) {
                let step: IteratorResult<TTSChunk>;
                try {
                  step = await native.next();
                } catch (error) {
                  // A generator that threw is already complete, so there is
                  // nothing left to release.
                  nativeDone = true;
                  nativeFailed = true;
                  recordSegmentFailure(currentSegment, error);
                  break;
                }
                if (step.done) {
                  nativeDone = true;
                  break;
                }
                if (pendingChunk) {
                  yield pendingChunk;
                }
                pendingChunk = step.value;
              }
            } finally {
              // Reached on a consumer `.throw()` or `.return()` at the yield
              // above as well as on a normal break. `for await` closed the
              // inner generator for us; driving it by hand means closing it
              // here, so `readNativeSegment`'s own `finally` still settles the
              // span and releases the transport iterator.
              if (!nativeDone) {
                await native.return(undefined);
              }
            }
            if (nativeFailed || !outcome.fellBackToBuffered) {
              continue;
            }
          }

          let result: TTSResult;
          try {
            result = await processor.synthesize(segment, provider, options);
          } catch (error) {
            recordSegmentFailure(currentSegment, error);
            continue;
          }
          cumulativeSize += result.size;
          cumulativeDuration += result.duration ?? 0;
          const chunk: TTSChunk = {
            data: result.buffer,
            format: result.format,
            index: chunkIndex++,
            isFinal: false,
            cumulativeSize,
            estimatedDuration: cumulativeDuration || undefined,
            voice: result.voice,
            sampleRate: result.sampleRate,
          };
          if (pendingChunk) {
            yield pendingChunk;
          }
          pendingChunk = chunk;
        }
      } finally {
        // Mirror what `for await` did over `textChunks` before this loop was
        // driven by hand: close the source on any early exit, and leave an
        // already-exhausted iterator alone.
        if (!textExhausted) {
          const releaseText = textIterator.return;
          if (typeof releaseText === "function") {
            await releaseText.call(textIterator, undefined);
          }
        }
      }

      // Preserve the existing iterator-release handshake: a consumer break may
      // already have one normalized chunk parked behind the chunk it observed.
      // Let that in-flight `next()` settle so the queued `.return()` can enter
      // the generator and run wrapper `finally` blocks; the abandoned consumer
      // never receives this value.
      if (pendingChunk) {
        yield { ...pendingChunk, isFinal: true };
      }
      // Unconditional, as before native streaming: a segment that already
      // failed is reported even if `shouldStop()` has since flipped true. A
      // consumer that broke never reaches this line (its queued `.return()`
      // unwinds the generator at the yield above), so gating on `stopped()`
      // only ever suppressed a real failure for a caller driving
      // `shouldStop` directly.
      if (failedSegments.length > 0) {
        throw new IncrementalTTSSynthesisError(firstFailure, failedSegments);
      }
    })();

    return attachStreamCancel(stream, () => {
      cancelled = true;
      cancelStream(activeNativeStream);
      if (activeNativeIterator) {
        releaseIterator(activeNativeIterator);
      }
    });
  }
}
