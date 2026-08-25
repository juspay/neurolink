/**
 * Video Generation Processing Utility
 *
 * Central registry + dispatch for video-generation handlers across
 * providers (Vertex Veo, Kling, Runway, Replicate-hosted models, etc.).
 *
 * Mirrors the static-handler-registry pattern established by
 * `TTSProcessor` (`utils/ttsProcessor.ts`) and `STTProcessor`
 * (`utils/sttProcessor.ts`).
 *
 * @module utils/videoProcessor
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { VIDEO_ERROR_CODES } from "../constants/videoErrors.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import type {
  VideoGenerateOptions,
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
  VideoTransitionOptions,
} from "../types/index.js";
import { logger } from "./logger.js";
import { withTimeout } from "./async/withTimeout.js";

// Video generation is legitimately minutes-long (Kling/Runway render queues),
// so the bound is generous — its job is to convert a wedged handler into an
// error rather than an eternal hang, not to police normal latency.
const VIDEO_GENERATION_TIMEOUT_MS = 600_000;
// VideoError is canonical in vertexVideoHandler.ts (existing). Re-export
// here so consumers of `VideoProcessor` can import the typed error from
// the same module. Both throws and instanceof checks resolve to the same
// class.
import { VideoError } from "../adapters/video/vertexVideoHandler.js";
import { HandlerRegistry } from "../core/handlerRegistry.js";

export { VideoError, VIDEO_ERROR_CODES };

/**
 * Static processor managing the video handler registry.
 *
 * Handlers register themselves during `ProviderRegistry._doRegister()`
 * via `VideoProcessor.registerHandler(name, instance)`. Lookups are
 * O(1) on a normalised lower-case provider key.
 */
export class VideoProcessor {
  private static readonly registry = new HandlerRegistry<VideoHandler>(
    "VideoProcessor",
  );

  /**
   * Register a video handler for a specific provider.
   */
  static registerHandler(providerName: string, handler: VideoHandler): void {
    const key = providerName ? providerName.toLowerCase() : providerName;
    this.registry.register(providerName, handler);
    logger.debug(`[VideoProcessor] Registered video handler: ${key}`);
  }

  /**
   * Check if a provider has a registered video handler.
   */
  static supports(providerName: string): boolean {
    return this.registry.supports(providerName);
  }

  /**
   * List the names of all registered providers.
   */
  static listProviders(): string[] {
    return this.registry.list();
  }

  private static getHandler(providerName: string): VideoHandler | undefined {
    return this.registry.get(providerName);
  }

  /**
   * Clear all registered handlers (for testing).
   */
  static clearHandlers(): void {
    this.registry.clear();
  }

  private static buildSpanAttributes(
    provider: string,
    options: VideoOutputOptions,
  ): Record<string, string | number | boolean | undefined> {
    return {
      "video.operation": "generate",
      "video.provider": provider,
      "video.resolution": options.resolution,
      "video.duration": options.length,
      "video.aspect_ratio": options.aspectRatio,
      "video.audio": options.audio,
    };
  }

  /**
   * Generate a single video clip via the registered handler.
   *
   * @param provider - Registered provider name (e.g. "vertex", "kling")
   * @param options - Bag of the source image, prompt, optional region
   *   override, and resolution / length / aspect-ratio / audio options.
   *   Translated internally into the handler-level 4-positional-argument
   *   call — `VideoHandler.generate()`'s own signature is unchanged.
   * @throws VideoError on registry miss, handler-not-configured, or
   *         generation failure
   */
  static async generate(
    provider: string,
    options: VideoGenerateOptions,
  ): Promise<VideoGenerationResult>;
  /**
   * @deprecated Positional form kept for backward compatibility with
   * pre-bag callers (VideoProcessor is a public export). Use the
   * options-bag overload.
   */
  static async generate(
    provider: string,
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult>;
  static async generate(
    provider: string,
    optionsOrImage: VideoGenerateOptions | Buffer,
    legacyPrompt?: string,
    legacyOptions?: VideoOutputOptions,
    legacyRegion?: string,
  ): Promise<VideoGenerationResult> {
    const bag: VideoGenerateOptions = Buffer.isBuffer(optionsOrImage)
      ? {
          image: optionsOrImage,
          prompt: legacyPrompt ?? "",
          ...(legacyRegion !== undefined ? { region: legacyRegion } : {}),
          ...(legacyOptions ?? {}),
        }
      : optionsOrImage;
    const { image, prompt, region, ...videoOptions } = bag;
    const span = SpanSerializer.createSpan(
      SpanType.MEDIA_GENERATION,
      "video.generate",
      this.buildSpanAttributes(provider, videoOptions),
    );

    try {
      const handler = this.getHandler(provider);
      if (!handler) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
          message: `Video provider "${provider}" is not registered. Available: ${this.listProviders().join(", ")}`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider, available: this.listProviders() },
        });
      }
      if (!handler.isConfigured()) {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
          message: `Video provider "${provider}" is not configured. Set the required credentials.`,
          category: ErrorCategory.CONFIGURATION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { provider },
        });
      }

      logger.debug(
        `[VideoProcessor] Starting video generation with provider: ${provider}`,
      );

      // Bounded per repo guideline (async provider calls wrap withTimeout):
      // video generation is legitimately slow, so the deadline is generous —
      // but a wedged handler must error, never hang the caller forever.
      const result = await withTimeout(
        handler.generate(image, prompt, videoOptions, region),
        VIDEO_GENERATION_TIMEOUT_MS,
        `Video generation via "${provider}" timed out after ${VIDEO_GENERATION_TIMEOUT_MS}ms`,
      );

      const ended = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(ended);

      logger.info(
        `[VideoProcessor] Generated ${result.data.length} bytes (${provider})`,
      );
      return result;
    } catch (err: unknown) {
      const ended = SpanSerializer.endSpan(
        span,
        SpanStatus.ERROR,
        err instanceof Error ? err.message : String(err),
      );
      getMetricsAggregator().recordSpan(ended);

      if (err instanceof VideoError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Video generation failed for provider "${provider}": ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { provider, options: videoOptions, region },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }

  /**
   * Generate a transition clip via the registered handler (Director Mode).
   *
   * Providers without first-and-last-frame interpolation surface a typed
   * `TRANSITION_NOT_SUPPORTED` error here; callers should fall back to
   * generating a regular clip with a transition prompt.
   */
  static async generateTransition(
    provider: string,
    firstFrame: Buffer,
    lastFrame: Buffer,
    prompt: string,
    options?: VideoTransitionOptions,
    region?: string,
  ): Promise<Buffer> {
    const handler = this.getHandler(provider);
    if (!handler) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        message: `Video provider "${provider}" is not registered for transitions`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider, available: this.listProviders() },
      });
    }
    if (!handler.generateTransition) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.TRANSITION_NOT_SUPPORTED,
        message: `Video provider "${provider}" does not support transition clips`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { provider },
      });
    }
    if (!handler.isConfigured()) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: `Video provider "${provider}" is not configured`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider },
      });
    }

    try {
      // Same bound as generate(): a wedged transition must error, not hang.
      return await withTimeout(
        handler.generateTransition(
          firstFrame,
          lastFrame,
          prompt,
          options,
          region,
        ),
        VIDEO_GENERATION_TIMEOUT_MS,
        `Video transition via "${provider}" timed out after ${VIDEO_GENERATION_TIMEOUT_MS}ms`,
      );
    } catch (err: unknown) {
      if (err instanceof VideoError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new VideoError({
        code: VIDEO_ERROR_CODES.DIRECTOR_TRANSITION_FAILED,
        message: `Video transition generation failed for provider "${provider}": ${message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        context: {
          provider,
          firstFrameSize: firstFrame.length,
          lastFrameSize: lastFrame.length,
          durationSeconds: options?.durationSeconds,
        },
        originalError: err instanceof Error ? err : undefined,
      });
    }
  }
}
