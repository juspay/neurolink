/**
 * Music Generation Processing Utility
 *
 * Central registry + dispatch for music-generation handlers across
 * providers (Beatoven, ElevenLabs Music, Lyria, Replicate-hosted models).
 *
 * Mirrors the static-handler-registry pattern established by
 * `TTSProcessor` / `STTProcessor` / `VideoProcessor`.
 *
 * @module utils/musicProcessor
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import type {
  MusicHandler,
  MusicOptions,
  MusicResult,
} from "../types/index.js";
import { NeuroLinkError } from "./errorHandling.js";
import { logger } from "./logger.js";

/**
 * Music-specific error codes.
 */
export const MUSIC_ERROR_CODES = {
  PROVIDER_NOT_SUPPORTED: "MUSIC_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "MUSIC_PROVIDER_NOT_CONFIGURED",
  GENERATION_FAILED: "MUSIC_GENERATION_FAILED",
  POLL_TIMEOUT: "MUSIC_POLL_TIMEOUT",
  PROMPT_REQUIRED: "MUSIC_PROMPT_REQUIRED",
  DURATION_INVALID: "MUSIC_DURATION_INVALID",
  INVALID_INPUT: "MUSIC_INVALID_INPUT",
} as const;

/**
 * Typed error class for music-generation failures.
 */
export class MusicError extends NeuroLinkError {
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
      category: options.category ?? ErrorCategory.EXECUTION,
      severity: options.severity ?? ErrorSeverity.HIGH,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "MusicError";
  }
}

/**
 * Static processor managing the music handler registry.
 */
export class MusicProcessor {
  private static readonly handlers = new Map<string, MusicHandler>();

  /**
   * Register a music handler for a specific provider.
   */
  static registerHandler(providerName: string, handler: MusicHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }
    if (!handler) {
      throw new Error("Handler is required");
    }
    const key = providerName.toLowerCase();
    if (this.handlers.has(key)) {
      logger.warn(
        `[MusicProcessor] Overwriting existing handler for provider: ${key}`,
      );
    }
    this.handlers.set(key, handler);
    logger.debug(`[MusicProcessor] Registered music handler: ${key}`);
  }

  /**
   * Check if a provider has a registered music handler.
   */
  static supports(providerName: string): boolean {
    if (!providerName) {
      return false;
    }
    return this.handlers.has(providerName.toLowerCase());
  }

  /**
   * List the names of all registered providers.
   */
  static listProviders(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get a registered music handler by provider name.
   *
   * Exposed publicly so module-level auto-registration code can reuse an
   * already-registered primary handler when backfilling its aliases.
   */
  static getHandler(providerName: string): MusicHandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
  }

  private static buildSpanAttributes(
    provider: string,
    options: MusicOptions,
  ): Record<string, string | number | boolean | undefined> {
    return {
      "music.operation": "generate",
      "music.provider": provider,
      "music.duration": options.duration,
      "music.format": options.format,
      "music.genre": options.genre,
      "music.mood": options.mood,
    };
  }

  /**
   * Generate a music track via the registered handler.
   *
   * @throws MusicError on registry miss, handler-not-configured, or
   *         generation failure.
   */
  static async generate(
    provider: string,
    options: MusicOptions,
  ): Promise<MusicResult> {
    const span = SpanSerializer.createSpan(
      SpanType.MEDIA_GENERATION,
      "music.generate",
      this.buildSpanAttributes(provider, options),
    );

    try {
      const trimmedPrompt = options.prompt?.trim();
      if (!trimmedPrompt) {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.PROMPT_REQUIRED,
          message: "Music generation requires a non-empty prompt",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          retriable: false,
          context: { provider },
        });
      }

      const handler = this.getHandler(provider);
      if (!handler) {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Music provider "${provider}" is not registered. Available: ${this.listProviders().join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider, available: this.listProviders() },
        });
      }
      if (!handler.isConfigured()) {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Music provider "${provider}" is not configured. Set the required credentials.`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      // Optional duration validation against per-provider max.
      if (
        options.duration !== undefined &&
        handler.maxDurationSeconds !== undefined &&
        options.duration > handler.maxDurationSeconds
      ) {
        throw new MusicError({
          code: MUSIC_ERROR_CODES.DURATION_INVALID,
          message: `Requested duration (${options.duration}s) exceeds provider maximum (${handler.maxDurationSeconds}s) for "${provider}"`,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: {
            provider,
            requested: options.duration,
            maximum: handler.maxDurationSeconds,
          },
        });
      }

      logger.debug(
        `[MusicProcessor] Starting music generation with provider: ${provider}`,
      );

      const result = await handler.generate({
        ...options,
        prompt: trimmedPrompt,
      });

      const ended = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(ended);

      logger.info(
        `[MusicProcessor] Generated ${result.size} bytes (${provider})`,
      );
      return result;
    } catch (err: unknown) {
      const ended = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(ended);

      if (err instanceof MusicError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new MusicError({
        code: MUSIC_ERROR_CODES.GENERATION_FAILED,
        message: `Music generation failed for provider "${provider}": ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: {
          provider,
          duration: options.duration,
          format: options.format,
          genre: options.genre,
          mood: options.mood,
          tempo: options.tempo,
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
