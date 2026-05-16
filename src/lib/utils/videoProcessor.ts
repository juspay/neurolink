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
  VideoGenerationResult,
  VideoHandler,
  VideoOutputOptions,
  VideoTransitionOptions,
} from "../types/index.js";
import { logger } from "./logger.js";
// VideoError is canonical in vertexVideoHandler.ts (existing). Re-export
// here so consumers of `VideoProcessor` can import the typed error from
// the same module. Both throws and instanceof checks resolve to the same
// class.
import { VideoError } from "../adapters/video/vertexVideoHandler.js";

export { VideoError, VIDEO_ERROR_CODES };

/**
 * Static processor managing the video handler registry.
 *
 * Handlers register themselves during `ProviderRegistry._doRegister()`
 * via `VideoProcessor.registerHandler(name, instance)`. Lookups are
 * O(1) on a normalised lower-case provider key.
 */
export class VideoProcessor {
  private static readonly handlers = new Map<string, VideoHandler>();

  /**
   * Register a video handler for a specific provider.
   */
  static registerHandler(providerName: string, handler: VideoHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }
    if (!handler) {
      throw new Error("Handler is required");
    }
    const key = providerName.toLowerCase();
    if (this.handlers.has(key)) {
      logger.warn(
        `[VideoProcessor] Overwriting existing handler for provider: ${key}`,
      );
    }
    this.handlers.set(key, handler);
    logger.debug(`[VideoProcessor] Registered video handler: ${key}`);
  }

  /**
   * Check if a provider has a registered video handler.
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

  private static getHandler(providerName: string): VideoHandler | undefined {
    return this.handlers.get(providerName.toLowerCase());
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
   * @param image - Source image buffer
   * @param prompt - Text prompt describing the desired motion / content
   * @param options - Resolution / length / aspect-ratio / audio options
   * @param region - Optional region override (Vertex location, etc.)
   * @throws VideoError on registry miss, handler-not-configured, or
   *         generation failure
   */
  static async generate(
    provider: string,
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult> {
    const span = SpanSerializer.createSpan(
      SpanType.MEDIA_GENERATION,
      "video.generate",
      this.buildSpanAttributes(provider, options),
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

      const result = await handler.generate(image, prompt, options, region);

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
        context: { provider, options, region },
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
      return await handler.generateTransition(
        firstFrame,
        lastFrame,
        prompt,
        options,
        region,
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
