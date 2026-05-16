/**
 * Video Generation Type Definitions
 *
 * Shared types for video generation across providers (Vertex Veo, Kling,
 * Runway, Replicate-hosted models, etc.).
 *
 * The shared base shapes (`VideoOutputOptions`, `VideoGenerationResult`)
 * are defined in `multimodal.ts` for backwards compatibility — they are
 * re-exported here so callers can import every video-related type from a
 * single module.
 *
 * @module types/video
 */

import type {
  VideoGenerationResult,
  VideoOutputOptions,
} from "./multimodal.js";

// Re-export from multimodal for caller convenience.
export type {
  VideoGenerationResult,
  VideoOutputOptions,
} from "./multimodal.js";

/**
 * Director-mode transition options.
 *
 * Used by handlers that support first-and-last-frame interpolation
 * (e.g., Veo 3.1 Fast). Providers without transition support omit the
 * `generateTransition` method on `VideoHandler`.
 */
export type VideoTransitionOptions = {
  aspectRatio?: "9:16" | "16:9" | "1:1" | string;
  resolution?: "720p" | "1080p";
  audio?: boolean;
  /** Duration of the transition clip (Veo accepts 4, 6, or 8). Default 4. */
  durationSeconds?: 4 | 6 | 8;
};

/**
 * Handler contract for video generation providers.
 *
 * Every concrete handler (`VertexVideoHandler`, `KlingVideoHandler`,
 * `RunwayVideoHandler`, `ReplicateVideoHandler`, …) implements this
 * interface and registers itself with `VideoProcessor.registerHandler`.
 *
 * Implementations MUST enforce their own timeouts. The recommended
 * total-deadline for image-to-video predictLongRunning APIs is
 * 3-5 minutes; the per-request fetch timeout is 30 seconds.
 */
export type VideoHandler = {
  /**
   * Generate a single video clip from an input image and prompt.
   *
   * @param image - Input image buffer (JPEG, PNG, or WebP)
   * @param prompt - Text prompt describing desired video motion / content
   * @param options - Resolution, length, aspect ratio, audio settings
   * @param region - Provider-specific region override (e.g. Vertex location)
   * @returns Buffer + metadata
   */
  generate(
    image: Buffer,
    prompt: string,
    options: VideoOutputOptions,
    region?: string,
  ): Promise<VideoGenerationResult>;

  /**
   * Optional — generate a transition clip between two frames (Director Mode).
   *
   * Providers without first-and-last-frame interpolation omit this method;
   * `VideoProcessor.generateTransition` will surface a typed error.
   *
   * `durationSeconds` is on `VideoTransitionOptions` (default 4).
   */
  generateTransition?(
    firstFrame: Buffer,
    lastFrame: Buffer,
    prompt: string,
    options?: VideoTransitionOptions,
    region?: string,
  ): Promise<Buffer>;

  /** Validate the provider is configured (auth, base URL, etc.). */
  isConfigured(): boolean;

  /** Maximum video duration in seconds supported by this provider. */
  readonly maxDurationSeconds?: number;

  /** Supported aspect ratios. */
  readonly supportedAspectRatios?: readonly (
    | "9:16"
    | "16:9"
    | "1:1"
    | "4:3"
    | "3:4"
  )[];

  /** Supported output resolutions. */
  readonly supportedResolutions?: readonly ("480p" | "720p" | "1080p" | "4k")[];
};

// =============================================================================
// PROVIDER-SPECIFIC RESPONSE SHAPES
// =============================================================================

/**
 * Kling (PiAPI) task status response.
 */
export type KlingTaskResponse = {
  status?: string;
  video_url?: string;
  output?: { video_url?: string };
  error?: string;
};

/**
 * Runway task status response.
 */
export type RunwayTaskResponse = {
  status?: string;
  output?: string[] | string;
  error?: string;
  failure?: string;
};
