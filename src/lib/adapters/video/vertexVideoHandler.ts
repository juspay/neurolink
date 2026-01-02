/**
 * Vertex AI Video Generation Handler
 *
 * Standalone module for Veo 3.1 video generation via Vertex AI.
 * Generates videos from an input image and text prompt.
 *
 * Based on Vertex AI Veo 3.1 video generation API
 *
 * @module adapters/video/vertexVideoHandler
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos
 */

import { readFile } from "node:fs/promises";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { TIMEOUTS } from "../../constants/timeouts.js";
import type {
  VideoGenerationResult,
  VideoOutputOptions,
} from "../../types/multimodal.js";
import { NeuroLinkError, withTimeout } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// VIDEO ERROR CODES
// ============================================================================

/**
 * Video generation runtime error codes
 *
 * These are for runtime/execution errors during video generation.
 * Input validation errors (missing image, invalid options, etc.) are handled
 * by parameterValidation.ts using ERROR_CODES from errorHandling.ts.
 *
 * Following TTS pattern (TTS_ERROR_CODES + TTSError in ttsProcessor.ts)
 */
export const VIDEO_ERROR_CODES = {
  /** Video generation API call failed */
  GENERATION_FAILED: "VIDEO_GENERATION_FAILED",
  /** Provider (Vertex AI) not properly configured */
  PROVIDER_NOT_CONFIGURED: "VIDEO_PROVIDER_NOT_CONFIGURED",
  /** Polling for video completion timed out */
  POLL_TIMEOUT: "VIDEO_POLL_TIMEOUT",
} as const;

/**
 * Video generation error class
 * Extends NeuroLinkError for consistent error handling across the SDK
 */
export class VideoError extends NeuroLinkError {
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
    this.name = "VideoError";
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Timeout for video generation (3 minutes - video gen typically takes 1-2 min) */
const VIDEO_GENERATION_TIMEOUT_MS = 180000;

/** Polling interval for checking operation status (5 seconds) */
const POLL_INTERVAL_MS = 5000;

/** Full model name for Veo 3.1 (IMPORTANT: not just "veo-3.1") */
const VEO_MODEL = "veo-3.1-generate-001";

/** Default location for Vertex AI */
const DEFAULT_LOCATION = "us-central1";

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Check if Vertex AI is configured for video generation
 *
 * @returns True if Google Cloud credentials are available
 *
 * @example
 * ```typescript
 * if (!isVertexVideoConfigured()) {
 *   console.error("Set GOOGLE_APPLICATION_CREDENTIALS to enable video generation");
 * }
 * ```
 */
export function isVertexVideoConfigured(): boolean {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY)
  );
}

/**
 * Get Vertex AI project configuration from environment variables or ADC credentials
 *
 * @returns Project ID and location for Vertex AI
 * @throws VideoError if project cannot be determined
 */
async function getVertexConfig(): Promise<{
  project: string;
  location: string;
}> {
  const location =
    process.env.GOOGLE_VERTEX_LOCATION ||
    process.env.GOOGLE_CLOUD_LOCATION ||
    DEFAULT_LOCATION;

  // Try environment variables first
  let project =
    process.env.GOOGLE_VERTEX_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID;

  // Fallback: read from ADC credentials file
  if (!project && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const credData = JSON.parse(
        await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"),
      );
      project = credData.quota_project_id || credData.project_id;
    } catch (e) {
      // Ignore read errors, will throw below if project still not found
      logger.debug("Failed to read project from credentials file", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (!project) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message:
        "Google Cloud project not found. Set GOOGLE_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT environment variable, or ensure ADC credentials contain project_id",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        missingVar: "GOOGLE_VERTEX_PROJECT",
        feature: "video-generation",
        checkedEnvVars: [
          "GOOGLE_VERTEX_PROJECT",
          "GOOGLE_CLOUD_PROJECT",
          "GOOGLE_CLOUD_PROJECT_ID",
          "VERTEX_PROJECT_ID",
        ],
      },
    });
  }

  return { project, location };
}

/**
 * Get access token for Vertex AI authentication
 *
 * Uses google-auth-library (transitive dependency from @google-cloud/vertexai)
 * to obtain access token from configured credentials.
 *
 * @returns Access token string
 * @throws VideoError if authentication fails
 */
async function getAccessToken(): Promise<string> {
  try {
    // google-auth-library is a transitive dependency from @google-cloud/vertexai
    // Using dynamic import with type assertion for runtime resolution
    const googleAuthLib = (await import(
      "google-auth-library" as unknown as string
    )) as {
      GoogleAuth: new (options: {
        keyFilename?: string;
        scopes?: string[];
      }) => {
        getAccessToken(): Promise<string | null | undefined>;
      };
    };

    const auth = new googleAuthLib.GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const token = await withTimeout(
      auth.getAccessToken(),
      TIMEOUTS.PROVIDER.AUTH_MS,
    );

    if (!token) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        message: "Failed to obtain access token from Google Cloud credentials",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { provider: "vertex", feature: "video-generation" },
      });
    }

    return token;
  } catch (error) {
    if (error instanceof VideoError) {
      throw error;
    }

    throw new VideoError({
      code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message: `Google Cloud authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider: "vertex", feature: "video-generation" },
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

// ============================================================================
// IMAGE UTILITIES
// ============================================================================

/**
 * Detect MIME type from image buffer magic bytes
 *
 * @param image - Image buffer to analyze
 * @returns MIME type string (defaults to "image/jpeg" if unknown)
 */
function detectMimeType(image: Buffer): string {
  // Validate buffer has minimum length for format detection
  if (image.length < 4) {
    logger.warn("Image buffer too small for format detection", {
      size: image.length,
    });
    return "image/jpeg";
  }

  // JPEG: FF D8 FF
  if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (
    image[0] === 0x89 &&
    image[1] === 0x50 &&
    image[2] === 0x4e &&
    image[3] === 0x47
  ) {
    return "image/png";
  }

  // WebP: RIFF header (52 49 46 46) + WEBP at offset 8 (57 45 42 50)
  if (
    image.length >= 12 &&
    image[0] === 0x52 &&
    image[1] === 0x49 &&
    image[2] === 0x46 &&
    image[3] === 0x46 &&
    image[8] === 0x57 &&
    image[9] === 0x45 &&
    image[10] === 0x42 &&
    image[11] === 0x50
  ) {
    return "image/webp";
  }

  // Default fallback
  logger.warn("Unknown image format detected, defaulting to image/jpeg", {
    firstBytes: image.slice(0, 12).toString("hex"),
    size: image.length,
  });
  return "image/jpeg";
}

/**
 * Calculate video dimensions based on resolution and aspect ratio
 *
 * @param resolution - Video resolution ("720p" or "1080p")
 * @param aspectRatio - Aspect ratio ("16:9" or "9:16")
 * @returns Width and height dimensions
 */
function calculateDimensions(
  resolution: "720p" | "1080p",
  aspectRatio: "9:16" | "16:9",
): { width: number; height: number } {
  if (resolution === "1080p") {
    return aspectRatio === "9:16"
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 };
  }

  // 720p
  return aspectRatio === "9:16"
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 };
}

// ============================================================================
// VIDEO GENERATION
// ============================================================================

/**
 * Generate video using Vertex AI Veo 3.1
 *
 * Creates a video from an input image and text prompt using Google's Veo 3.1 model.
 * The video is generated with optional audio and can be customized for resolution,
 * duration, and aspect ratio.
 *
 * @param image - Input image buffer (JPEG, PNG, or WebP)
 * @param prompt - Text prompt describing desired video motion/content (max 500 chars)
 * @param options - Video output options (resolution, length, aspect ratio, audio)
 * @returns VideoGenerationResult with video buffer and metadata
 *
 * @throws {VideoError} When credentials are not configured (PROVIDER_NOT_CONFIGURED)
 * @throws {VideoError} When API returns an error (GENERATION_FAILED)
 * @throws {VideoError} When polling times out (POLL_TIMEOUT)
 *
 * @example
 * ```typescript
 * import { generateVideoWithVertex } from "@juspay/neurolink/adapters/video/vertexVideoHandler";
 * import { readFileSync, writeFileSync } from "fs";
 *
 * const image = readFileSync("./input.png");
 * const result = await generateVideoWithVertex(
 *   image,
 *   "Smooth cinematic camera movement with dramatic lighting",
 *   { resolution: "720p", length: 6, aspectRatio: "16:9", audio: true }
 * );
 *
 * writeFileSync("output.mp4", result.data);
 * ```
 */
export async function generateVideoWithVertex(
  image: Buffer,
  prompt: string,
  options: VideoOutputOptions = {},
): Promise<VideoGenerationResult> {
  // Validate configuration
  if (!isVertexVideoConfigured()) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message:
        "Vertex AI credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS environment variable",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        provider: "vertex",
        feature: "video-generation",
        suggestion:
          "Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON file",
      },
    });
  }

  const { project, location } = await getVertexConfig();
  const startTime = Date.now();

  // Set defaults (matching reference implementation)
  const resolution = options.resolution || "720p";
  const durationSeconds = options.length || 6; // 4, 6, or 8
  const aspectRatio = options.aspectRatio || "16:9";
  const generateAudio = options.audio ?? true;

  logger.debug("Starting Vertex video generation", {
    project,
    location,
    model: VEO_MODEL,
    resolution,
    durationSeconds,
    aspectRatio,
    generateAudio,
    promptLength: prompt.length,
    imageSize: image.length,
  });

  try {
    // Encode image to base64 and detect MIME type
    const imageBase64 = image.toString("base64");
    const mimeType = detectMimeType(image);

    // Get auth token
    const accessToken = await getAccessToken();

    // Construct API request - predictLongRunning endpoint
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${VEO_MODEL}:predictLongRunning`;

    // Request body structure (verified working from video.js reference)
    const requestBody = {
      instances: [
        {
          prompt: prompt,
          image: {
            bytesBase64Encoded: imageBase64,
            mimeType: mimeType,
          },
        },
      ],
      parameters: {
        sampleCount: 1,
        durationSeconds: durationSeconds,
        aspectRatio: aspectRatio,
        resolution: resolution,
        generateAudio: generateAudio,
        resizeMode: "pad", // "pad" preserves aspect ratio, "crop" fills frame
      },
    };

    logger.debug("Sending video generation request", { endpoint });

    // Create abort controller for request timeout
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 30000); // 30s request timeout

    // Start long-running operation
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(requestTimeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.GENERATION_FAILED,
          message: "Video generation request timed out after 30 seconds",
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: true,
          context: { provider: "vertex", endpoint, timeout: 30000 },
        });
      }
      throw error;
    }
    clearTimeout(requestTimeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Vertex API error: ${response.status} - ${errorText}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500, // 5xx errors are retriable
        context: {
          status: response.status,
          error: errorText,
          provider: "vertex",
          endpoint,
        },
      });
    }

    const operation = await response.json();
    const operationName = operation.name;

    if (!operationName) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: "Vertex API did not return an operation name",
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { response: operation, provider: "vertex" },
      });
    }

    logger.debug("Video generation operation started", { operationName });

    // Poll for completion using fetchPredictOperation endpoint
    const remainingTime =
      VIDEO_GENERATION_TIMEOUT_MS - (Date.now() - startTime);
    const videoBuffer = await pollVideoOperation(
      operationName,
      accessToken,
      project,
      location,
      Math.max(1000, remainingTime), // Ensure at least 1 second timeout
    );

    const processingTime = Date.now() - startTime;

    // Calculate dimensions based on resolution and aspect ratio
    const dimensions = calculateDimensions(resolution, aspectRatio);

    logger.info("Video generation complete", {
      processingTime,
      videoSizeKB: Math.round(videoBuffer.length / 1024),
      dimensions,
    });

    return {
      data: videoBuffer,
      mediaType: "video/mp4",
      metadata: {
        duration: durationSeconds,
        dimensions,
        model: VEO_MODEL,
        provider: "vertex",
        aspectRatio,
        audioEnabled: generateAudio,
        processingTime,
      },
    };
  } catch (error) {
    // Re-throw VideoError as-is
    if (error instanceof VideoError) {
      throw error;
    }

    // Wrap other errors
    throw new VideoError({
      code: VIDEO_ERROR_CODES.GENERATION_FAILED,
      message: `Video generation failed: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { provider: "vertex" },
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

// ============================================================================
// POLLING HELPERS
// ============================================================================

/**
 * Vertex AI operation result type for type safety
 */
type VertexOperationResult = {
  done?: boolean;
  response?: {
    videos?: Array<{
      bytesBase64Encoded?: string;
      gcsUri?: string;
    }>;
  };
  error?: {
    message?: string;
  };
};

/**
 * Extract video buffer from completed operation result
 *
 * @param result - Completed operation result from Vertex AI
 * @param operationName - Operation name for error context
 * @returns Video buffer
 * @throws VideoError if video data is missing or in unexpected format
 */
function extractVideoFromResult(
  result: VertexOperationResult,
  operationName: string,
): Buffer {
  // Check for error in completed operation
  if (result.error) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.GENERATION_FAILED,
      message: `Video generation failed: ${result.error.message || JSON.stringify(result.error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { operationName, error: result.error, provider: "vertex" },
    });
  }

  // Extract video from response - structure is result.response.videos[0]
  const videoData = result.response?.videos?.[0];

  if (!videoData) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.GENERATION_FAILED,
      message: "No video data in response from Vertex AI",
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { operationName, response: result.response, provider: "vertex" },
    });
  }

  // Video can be returned as base64 or GCS URI
  if (videoData.gcsUri) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.GENERATION_FAILED,
      message: `Video stored at GCS: ${videoData.gcsUri}. GCS download not yet implemented.`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        operationName,
        gcsUri: videoData.gcsUri,
        provider: "vertex",
        suggestion:
          "Do not set storageUri parameter to receive video as base64 inline",
      },
    });
  }

  if (videoData.bytesBase64Encoded) {
    return Buffer.from(videoData.bytesBase64Encoded, "base64");
  }

  throw new VideoError({
    code: VIDEO_ERROR_CODES.GENERATION_FAILED,
    message: "No video bytes in response - unexpected response format",
    category: ErrorCategory.EXECUTION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: { operationName, videoData, provider: "vertex" },
  });
}

/**
 * Make a poll request to the Vertex AI fetchPredictOperation endpoint
 *
 * @param pollEndpoint - Full URL for the poll endpoint
 * @param operationName - Operation name to poll
 * @param accessToken - Google Cloud access token
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 * @returns Response JSON from the poll request
 * @throws VideoError on request failure
 */
async function makePollRequest(
  pollEndpoint: string,
  operationName: string,
  accessToken: string,
  timeoutMs: number = 30000,
): Promise<VertexOperationResult> {
  const controller = new AbortController();
  const requestTimeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(pollEndpoint, {
      method: "POST", // NOTE: POST, not GET!
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ operationName }), // Pass operation name in body
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(requestTimeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.GENERATION_FAILED,
        message: `Poll request timed out after ${timeoutMs}ms`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        context: { provider: "vertex", operationName, timeout: timeoutMs },
      });
    }
    throw error;
  }
  clearTimeout(requestTimeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new VideoError({
      code: VIDEO_ERROR_CODES.GENERATION_FAILED,
      message: `Failed to poll video operation: ${response.status} - ${errorText}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: response.status >= 500,
      context: {
        operationName,
        status: response.status,
        error: errorText,
        provider: "vertex",
      },
    });
  }

  return response.json();
}

// ============================================================================
// POLLING
// ============================================================================

/**
 * Poll Vertex AI operation until complete
 *
 * IMPORTANT: Uses fetchPredictOperation endpoint (POST with operationName in body),
 * NOT the generic operations GET endpoint!
 *
 * @param operationName - Full operation name from predictLongRunning response
 * @param accessToken - Google Cloud access token
 * @param project - Google Cloud project ID
 * @param location - Vertex AI location
 * @param timeoutMs - Maximum time to wait for completion
 * @returns Video buffer when complete
 *
 * @throws {VideoError} On API error, timeout, or missing video data
 */
async function pollVideoOperation(
  operationName: string,
  accessToken: string,
  project: string,
  location: string,
  timeoutMs: number,
): Promise<Buffer> {
  const startTime = Date.now();

  // Use fetchPredictOperation endpoint - this is MODEL-SPECIFIC
  const pollEndpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${VEO_MODEL}:fetchPredictOperation`;

  while (Date.now() - startTime < timeoutMs) {
    const result = await makePollRequest(
      pollEndpoint,
      operationName,
      accessToken,
    );

    if (result.done) {
      return extractVideoFromResult(result, operationName);
    }

    const elapsed = Date.now() - startTime;
    logger.debug("Polling video operation...", {
      operationName,
      elapsed,
      remainingMs: timeoutMs - elapsed,
    });

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Timeout reached
  throw new VideoError({
    code: VIDEO_ERROR_CODES.POLL_TIMEOUT,
    message: `Video generation timed out after ${Math.round(timeoutMs / 1000)}s while polling for completion`,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.HIGH,
    retriable: true,
    context: {
      operationName,
      timeoutMs,
      provider: "vertex",
      suggestion:
        "Try again - video generation can take 1-3 minutes. Consider using a shorter duration or lower resolution.",
    },
  });
}
