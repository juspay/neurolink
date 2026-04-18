/**
 * Director Mode Pipeline Orchestrator
 *
 * Orchestrates multi-segment video generation: parallel clip generation,
 * parallel frame extraction + transition generation, and sequential merge.
 *
 * Error severity semantics:
 * - HIGH: Fatal — clip generation / merge failures that abort the pipeline
 * - MEDIUM: Non-fatal — transition / frame-extraction failures that degrade
 *   to a hard cut but do not abort the pipeline
 *
 * @module adapters/video/directorPipeline
 */

import pLimit from "p-limit";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  ClipGenState,
  ClipResult,
  DirectorModeOptions,
  DirectorSegment,
  ImageWithAltText,
  TransitionResult,
  VideoGenerationResult,
  VideoOutputOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { validateImageForVideo } from "../../utils/parameterValidation.js";
import { VIDEO_ERROR_CODES } from "../../constants/videoErrors.js";
import { extractFirstFrame, extractLastFrame } from "./frameExtractor.js";
import {
  generateTransitionWithVertex,
  generateVideoWithVertex,
  VideoError,
} from "./vertexVideoHandler.js";
import { mergeVideoBuffers } from "./videoMerger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Fixed concurrency for parallel Vertex API calls */
const CLIP_CONCURRENCY = 2;

/** Max consecutive clip failures before circuit-breaker trips */
const CIRCUIT_BREAKER_THRESHOLD = 2;

/** Timeout for fetching a segment image over HTTP (15 seconds) */
const IMAGE_IO_TIMEOUT_MS = 15_000;

/** Default transition prompt when none is specified */
const DEFAULT_TRANSITION_PROMPT = "Smooth cinematic transition between scenes";

/** Default timeout for entire Director Mode pipeline (10 minutes) */
export const DIRECTOR_PIPELINE_TIMEOUT_MS = 600_000;

/** Default transition duration in seconds */
const DEFAULT_TRANSITION_DURATION: 4 | 6 | 8 = 4;

// ============================================================================
// IMAGE LOADING
// ============================================================================

/**
 * Resolve a DirectorSegment image input to a Buffer.
 *
 * Supports Buffer, HTTP(S) URL, local file path, and ImageWithAltText.
 *
 * @throws {VideoError} If the image cannot be resolved
 */
async function resolveImageToBuffer(
  image: Buffer | string | ImageWithAltText,
  segmentIndex: number,
): Promise<Buffer> {
  if (Buffer.isBuffer(image)) {
    return image;
  }

  if (typeof image === "string") {
    return image.startsWith("http://") || image.startsWith("https://")
      ? fetchImageFromUrl(image, segmentIndex)
      : readImageFromDisk(image, segmentIndex);
  }

  // ImageWithAltText
  if (typeof image === "object" && "data" in image) {
    const imgData = image.data;
    if (Buffer.isBuffer(imgData)) {
      return imgData;
    }
    if (typeof imgData === "string") {
      // Handle HTTP(S) URLs
      if (imgData.startsWith("http://") || imgData.startsWith("https://")) {
        return fetchImageFromUrl(imgData, segmentIndex);
      }

      // Handle data URIs (e.g., "data:image/png;base64,iVBORw0KG...")
      if (imgData.startsWith("data:")) {
        const base64Match = imgData.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match && base64Match[1]) {
          return Buffer.from(base64Match[1], "base64");
        }
        // Invalid data URI format
        throw new VideoError({
          code: VIDEO_ERROR_CODES.INVALID_INPUT,
          message: `Invalid data URI format for segment ${segmentIndex}. Expected format: data:<mime>;base64,<data>`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: { segmentIndex, dataUriPrefix: imgData.substring(0, 50) },
        });
      }

      // Try as file path
      try {
        return await readImageFromDisk(imgData, segmentIndex);
      } catch (fileError) {
        // Not a valid file path - throw clear error instead of silently treating as base64
        throw new VideoError({
          code: VIDEO_ERROR_CODES.INVALID_INPUT,
          message: `Invalid image input for segment ${segmentIndex}: not a valid URL, file path, or data URI`,
          category: ErrorCategory.EXECUTION,
          severity: ErrorSeverity.HIGH,
          retriable: false,
          context: {
            segmentIndex,
            inputType: "string",
            inputPrefix: imgData.substring(0, 50),
            fileError:
              fileError instanceof Error
                ? fileError.message
                : String(fileError),
          },
          originalError: fileError instanceof Error ? fileError : undefined,
        });
      }
    }
  }

  throw new VideoError({
    code: VIDEO_ERROR_CODES.INVALID_INPUT,
    message: `Invalid image type for segment ${segmentIndex}`,
    category: ErrorCategory.EXECUTION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: { segmentIndex },
  });
}

/** Fetch an image from an HTTP(S) URL with timeout. */
async function fetchImageFromUrl(
  url: string,
  segmentIndex: number,
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_IO_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message: `Failed to fetch image for segment ${segmentIndex}: HTTP ${response.status}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: response.status >= 500,
        context: { segmentIndex, url: url.substring(0, 100) },
      });
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof VideoError) {
      throw error;
    }
    throw new VideoError({
      code: VIDEO_ERROR_CODES.INVALID_INPUT,
      message: `Failed to fetch image for segment ${segmentIndex}: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { segmentIndex },
      originalError: error instanceof Error ? error : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Read an image from the local filesystem. */
async function readImageFromDisk(
  filePath: string,
  segmentIndex: number,
): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  try {
    return await readFile(filePath);
  } catch (error) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.INVALID_INPUT,
      message: `Failed to read image file for segment ${segmentIndex}: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { segmentIndex, path: filePath },
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

// ============================================================================
// PHASE 1: PARALLEL CLIP GENERATION (with circuit breaker)
// ============================================================================

/**
 * Process clip completions in order to maintain an accurate consecutive failure count.
 * This prevents out-of-order completions from incorrectly resetting the failure streak.
 *
 * Must be called after each clip completion (success or failure) to evaluate the
 * circuit breaker in submission order.
 */
function processOrderedCompletions(state: ClipGenState): void {
  // Process as many consecutive completed clips as possible
  while (state.nextExpectedIndex < state.completions.length) {
    const completion = state.completions[state.nextExpectedIndex];

    if (completion.status === "pending") {
      // Can't process further until this clip completes
      break;
    }

    if (completion.status === "success") {
      // Success resets the consecutive failure counter
      state.consecutiveFailures = 0;
    } else {
      // Failure increments the counter
      state.consecutiveFailures++;
      if (state.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        state.circuitOpen = true;
        logger.error(
          `Circuit breaker tripped after ${CIRCUIT_BREAKER_THRESHOLD} consecutive clip failures`,
        );
      }
    }

    state.nextExpectedIndex++;
  }
}

/**
 * Generate a single clip, applying circuit-breaker logic.
 *
 * @throws {VideoError} On generation failure or circuit breaker trip
 */
async function generateSingleClip(
  segment: DirectorSegment,
  index: number,
  videoOptions: VideoOutputOptions,
  region: string | undefined,
  state: ClipGenState,
): Promise<void> {
  if (state.circuitOpen) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_CLIP_FAILED,
      message: `Clip ${index} skipped — circuit breaker open after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { segmentIndex: index },
    });
  }

  const clipStart = Date.now();
  try {
    const imageBuffer = await resolveImageToBuffer(segment.image, index);

    // Validate image buffer (type, dimensions, size limits) before generation
    const imageValidation = validateImageForVideo(imageBuffer);
    if (imageValidation) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message: `Segment ${index} image validation failed: ${imageValidation.message}`,
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { segmentIndex: index, validation: imageValidation },
        originalError: imageValidation,
      });
    }

    const result = await generateVideoWithVertex(
      imageBuffer,
      segment.prompt,
      videoOptions,
      region,
    );

    const clipResult: ClipResult = {
      buffer: result.data,
      processingTime: Date.now() - clipStart,
    };

    // Record success and update results array
    state.results[index] = clipResult;
    state.completions[index] = { status: "success", result: clipResult };

    // Process completions in order to update circuit breaker state
    processOrderedCompletions(state);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Record failure in completion tracking
    state.completions[index] = { status: "failure", error: errorObj };

    // Process completions in order to update circuit breaker state
    processOrderedCompletions(state);

    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_CLIP_FAILED,
      message: `Clip ${index} generation failed: ${errorObj.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: {
        segmentIndex: index,
        consecutiveFailures: state.consecutiveFailures,
      },
      originalError: errorObj,
    });
  }
}

/**
 * Generate all main clips in parallel with a circuit breaker.
 *
 * The circuit breaker trips after `CIRCUIT_BREAKER_THRESHOLD` consecutive
 * failures, aborting remaining work to avoid wasted API calls.
 *
 * @returns Ordered array of clip results (indexed by segment number)
 * @throws {VideoError} On any clip failure (all clips are mandatory)
 */
async function generateClips(
  segments: DirectorSegment[],
  videoOptions: VideoOutputOptions,
  region: string | undefined,
): Promise<ClipResult[]> {
  const limit = pLimit(CLIP_CONCURRENCY);
  const state: ClipGenState = {
    consecutiveFailures: 0,
    circuitOpen: false,
    results: new Array(segments.length).fill(null),
    completions: new Array(segments.length).fill({ status: "pending" }),
    nextExpectedIndex: 0,
  };

  const clipPromises = segments.map((segment, i) =>
    limit(() => generateSingleClip(segment, i, videoOptions, region, state)),
  );

  // Collect results — any failure is fatal
  const settled = await Promise.allSettled(clipPromises);
  const failures = settled.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );

  if (failures.length > 0) {
    const firstError =
      failures[0].reason instanceof Error
        ? failures[0].reason
        : new Error(String(failures[0].reason));

    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_CLIP_FAILED,
      message: `Director Mode: ${failures.length}/${segments.length} clip(s) failed. First: ${firstError.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: {
        failedCount: failures.length,
        totalSegments: segments.length,
        circuitBreakerTripped: state.circuitOpen,
      },
      originalError: firstError,
    });
  }

  logger.info("All clips generated successfully", {
    clipCount: segments.length,
    concurrency: CLIP_CONCURRENCY,
  });

  return state.results as ClipResult[];
}

// ============================================================================
// PHASE 2: PARALLEL TRANSITION GENERATION
// ============================================================================

/**
 * Extract boundary frames and generate transition clips in parallel.
 *
 * Transition failures are non-fatal — they degrade to a hard cut.
 * Frame extraction gets one retry before giving up on that transition.
 */
async function generateTransitions(
  clipResults: ClipResult[],
  transitionPrompts: string[],
  transitionDurations: Array<4 | 6 | 8>,
  videoOptions: VideoOutputOptions,
  region: string | undefined,
): Promise<TransitionResult[]> {
  const transitionCount = clipResults.length - 1;
  if (transitionCount === 0) {
    return [];
  }

  const limit = pLimit(CLIP_CONCURRENCY);

  const transitionPromises = Array.from({ length: transitionCount }, (_, i) =>
    limit(async (): Promise<TransitionResult> => {
      const transStart = Date.now();
      const transPrompt = transitionPrompts[i] ?? DEFAULT_TRANSITION_PROMPT;
      const transDuration =
        transitionDurations[i] ?? DEFAULT_TRANSITION_DURATION;

      try {
        // Extract boundary frames (with one retry each)
        const lastFrameOfPrev = await extractFrameWithRetry(
          clipResults[i].buffer,
          "last",
          i,
        );
        const firstFrameOfNext = await extractFrameWithRetry(
          clipResults[i + 1].buffer,
          "first",
          i + 1,
        );

        // Generate transition clip
        const transBuffer = await generateTransitionWithVertex(
          lastFrameOfPrev,
          firstFrameOfNext,
          transPrompt,
          {
            aspectRatio: videoOptions.aspectRatio,
            resolution: videoOptions.resolution,
            audio: videoOptions.audio,
          },
          transDuration,
          region,
        );

        logger.debug(`Transition ${i}→${i + 1} generated`, {
          duration: transDuration,
          size: transBuffer.length,
          elapsedMs: Date.now() - transStart,
        });

        return {
          buffer: transBuffer,
          fromSegment: i,
          toSegment: i + 1,
          duration: transDuration,
          processingTime: Date.now() - transStart,
        };
      } catch (error) {
        // Non-fatal — fall back to hard cut
        logger.warn(
          `Transition ${i}→${i + 1} failed, falling back to hard cut`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return {
          buffer: null,
          fromSegment: i,
          toSegment: i + 1,
          duration: 0,
          processingTime: Date.now() - transStart,
        };
      }
    }),
  );

  return Promise.all(transitionPromises);
}

/**
 * Extract a frame from a clip buffer, retrying once on failure.
 */
async function extractFrameWithRetry(
  clipBuffer: Buffer,
  position: "first" | "last",
  clipIndex: number,
): Promise<Buffer> {
  const extract = position === "first" ? extractFirstFrame : extractLastFrame;

  try {
    return await extract(clipBuffer);
  } catch (firstError) {
    logger.warn(
      `Frame extraction (${position}) failed for clip ${clipIndex}, retrying once`,
      {
        error:
          firstError instanceof Error ? firstError.message : String(firstError),
      },
    );
    // Single retry — propagate on second failure
    return await extract(clipBuffer);
  }
}

// ============================================================================
// PHASE 3: SEQUENTIAL MERGE
// ============================================================================

/**
 * Build an interleaved buffer array (clip, transition, clip, …) and merge.
 */
async function mergeAllClips(
  clipResults: ClipResult[],
  transitionResults: TransitionResult[],
): Promise<Buffer> {
  const mergeBuffers: Buffer[] = [];
  const segmentCount = clipResults.length;
  const transitionCount = transitionResults.length;

  for (let i = 0; i < segmentCount; i++) {
    mergeBuffers.push(clipResults[i].buffer);
    if (i < transitionCount && transitionResults[i].buffer) {
      mergeBuffers.push(transitionResults[i].buffer as Buffer);
    }
  }

  try {
    return await mergeVideoBuffers(mergeBuffers);
  } catch (error) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_MERGE_FAILED,
      message: `Director Mode merge failed: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        clipCount: segmentCount,
        transitionCount: transitionResults.filter((t) => t.buffer).length,
      },
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

// ============================================================================
// PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Execute the full Director Mode pipeline.
 *
 * Pipeline stages:
 * 1. Parallel clip generation (concurrency = 2, circuit breaker after 2 failures)
 * 2. Parallel frame extraction + transition generation
 * 3. Sequential merge into single MP4
 *
 * @param segments - Array of DirectorSegment objects (2-10)
 * @param videoOptions - Video output options (resolution, length, aspectRatio, audio)
 * @param directorOptions - Director Mode options (transition prompts/durations)
 * @param region - Vertex AI region override
 * @returns VideoGenerationResult with merged video and Director metadata
 */
export async function executeDirectorPipeline(
  segments: DirectorSegment[],
  videoOptions: VideoOutputOptions = {},
  directorOptions: DirectorModeOptions = {},
  region?: string,
): Promise<VideoGenerationResult> {
  const pipelineStart = Date.now();
  const segmentCount = segments.length;
  const transitionCount = segmentCount - 1;
  const clipDuration = videoOptions.length ?? 6;

  const transitionPrompts = directorOptions.transitionPrompts ?? [];
  const transitionDurations = directorOptions.transitionDurations ?? [];

  logger.info("Starting Director Mode pipeline", {
    segmentCount,
    transitionCount,
    concurrency: CLIP_CONCURRENCY,
    clipDuration,
    resolution: videoOptions.resolution ?? "720p",
  });

  // Phase 1: Generate all clips
  const clipResults = await generateClips(segments, videoOptions, region);

  logger.info("Phase 1 complete — all clips generated", {
    clipCount: clipResults.length,
    elapsedMs: Date.now() - pipelineStart,
  });

  // Phase 2: Generate transitions in parallel
  const transitionResults = await generateTransitions(
    clipResults,
    transitionPrompts,
    transitionDurations,
    videoOptions,
    region,
  );

  const successfulTransitions = transitionResults.filter(
    (t) => t.buffer,
  ).length;
  const hardCuts = transitionCount - successfulTransitions;
  if (hardCuts > 0) {
    logger.warn(
      `${hardCuts}/${transitionCount} transition(s) fell back to hard cut`,
    );
  }

  logger.info("Phase 2 complete — transitions generated", {
    successful: successfulTransitions,
    hardCuts,
    elapsedMs: Date.now() - pipelineStart,
  });

  // Phase 3: Merge
  const mergedBuffer = await mergeAllClips(clipResults, transitionResults);

  // Build metadata
  const actualTransitionDurations = transitionResults.map((t) => t.duration);
  const totalDuration =
    segmentCount * clipDuration +
    actualTransitionDurations.reduce((a, b) => a + b, 0);

  const resolution = videoOptions.resolution ?? "720p";
  const aspectRatio = videoOptions.aspectRatio ?? "16:9";
  const dimensions =
    resolution === "1080p"
      ? aspectRatio === "9:16"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 }
      : aspectRatio === "9:16"
        ? { width: 720, height: 1280 }
        : { width: 1280, height: 720 };

  const processingTime = Date.now() - pipelineStart;

  logger.info("Director Mode pipeline complete", {
    totalDuration,
    segmentCount,
    transitionsGenerated: successfulTransitions,
    hardCuts,
    mergedSize: mergedBuffer.length,
    processingTime,
  });

  return {
    data: mergedBuffer,
    mediaType: "video/mp4",
    metadata: {
      duration: totalDuration,
      dimensions,
      model: "veo-3.1-generate-001",
      provider: "vertex",
      aspectRatio,
      audioEnabled: videoOptions.audio ?? true,
      processingTime,
      segmentCount,
      transitionCount: successfulTransitions,
      clipDuration,
      transitionDurations: actualTransitionDurations,
      segments: clipResults.map((c, i) => ({
        index: i,
        duration: clipDuration,
        processingTime: c.processingTime,
      })),
      transitions: transitionResults.map((t) => ({
        fromSegment: t.fromSegment,
        toSegment: t.toSegment,
        duration: t.duration,
        processingTime: t.processingTime,
      })),
    },
  };
}
