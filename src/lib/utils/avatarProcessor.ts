/**
 * Avatar / Lip-sync Generation Processing Utility
 *
 * Central registry + dispatch for avatar handlers across providers
 * (D-ID, HeyGen, Replicate-hosted MuseTalk / SadTalker / Wav2Lip).
 *
 * Mirrors the static-handler-registry pattern established by
 * `TTSProcessor` / `STTProcessor` / `VideoProcessor` / `MusicProcessor`.
 *
 * @module utils/avatarProcessor
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import type {
  AvatarHandler,
  AvatarOptions,
  AvatarResult,
} from "../types/index.js";
import { NeuroLinkError } from "./errorHandling.js";
import { logger } from "./logger.js";

/**
 * Avatar-specific error codes.
 */
export const AVATAR_ERROR_CODES = {
  PROVIDER_NOT_SUPPORTED: "AVATAR_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "AVATAR_PROVIDER_NOT_CONFIGURED",
  GENERATION_FAILED: "AVATAR_GENERATION_FAILED",
  POLL_TIMEOUT: "AVATAR_POLL_TIMEOUT",
  INVALID_INPUT: "AVATAR_INVALID_INPUT",
  AUDIO_REQUIRED: "AVATAR_AUDIO_REQUIRED",
  IMAGE_REQUIRED: "AVATAR_IMAGE_REQUIRED",
  AUDIO_TOO_LONG: "AVATAR_AUDIO_TOO_LONG",
} as const;

/**
 * Typed error class for avatar-generation failures.
 */
export class AvatarError extends NeuroLinkError {
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
    this.name = "AvatarError";
  }
}

/**
 * Static processor managing the avatar handler registry.
 */
export class AvatarProcessor {
  private static readonly handlers = new Map<string, AvatarHandler>();

  /**
   * Register an avatar handler for a specific provider.
   */
  static registerHandler(providerName: string, handler: AvatarHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }
    if (!handler) {
      throw new Error("Handler is required");
    }
    const key = providerName.toLowerCase();
    if (this.handlers.has(key)) {
      logger.warn(
        `[AvatarProcessor] Overwriting existing handler for provider: ${key}`,
      );
    }
    this.handlers.set(key, handler);
    logger.debug(`[AvatarProcessor] Registered avatar handler: ${key}`);
  }

  /**
   * Check if a provider has a registered avatar handler.
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

  private static getHandler(providerName: string): AvatarHandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
  }

  private static buildSpanAttributes(
    provider: string,
    options: AvatarOptions,
  ): Record<string, string | number | boolean | undefined> {
    return {
      "avatar.operation": "generate",
      "avatar.provider": provider,
      "avatar.quality": options.quality,
      "avatar.format": options.format,
      "avatar.has_text": options.text !== undefined,
      "avatar.has_audio": options.audio !== undefined,
    };
  }

  /**
   * Generate an avatar video via the registered handler.
   *
   * @throws AvatarError on registry miss, handler-not-configured, or
   *         generation failure.
   */
  static async generate(
    provider: string,
    options: AvatarOptions,
  ): Promise<AvatarResult> {
    const span = SpanSerializer.createSpan(
      SpanType.MEDIA_GENERATION,
      "avatar.generate",
      this.buildSpanAttributes(provider, options),
    );

    try {
      if (!options.image) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.IMAGE_REQUIRED,
          message:
            "Avatar generation requires an `image` (Buffer, path, or URL)",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retriable: false,
          context: { provider },
        });
      }

      if (!options.audio && !options.text) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.INVALID_INPUT,
          message:
            "Avatar generation requires either `audio` (a Buffer/URL) or `text` (to be TTS'd by the provider).",
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      const handler = this.getHandler(provider);
      if (!handler) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Avatar provider "${provider}" is not registered. Available: ${this.listProviders().join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider, available: this.listProviders() },
        });
      }
      if (!handler.isConfigured()) {
        throw new AvatarError({
          code: AVATAR_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Avatar provider "${provider}" is not configured. Set the required credentials.`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      logger.debug(
        `[AvatarProcessor] Starting avatar generation with provider: ${provider}`,
      );

      const result = await handler.generate(options);

      const ended = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(ended);

      logger.info(
        `[AvatarProcessor] Generated ${result.size} bytes (${provider})`,
      );
      return result;
    } catch (err: unknown) {
      const ended = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(ended);

      if (err instanceof AvatarError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new AvatarError({
        code: AVATAR_ERROR_CODES.GENERATION_FAILED,
        message: `Avatar generation failed for provider "${provider}": ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { provider },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
