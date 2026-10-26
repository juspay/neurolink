/**
 * Frame Extractor for Director Mode
 *
 * Extracts first and last frames from MP4 video buffers using FFmpeg.
 * Used by Director Mode to obtain boundary frames for Veo 3.1
 * first-and-last-frame interpolation transitions.
 *
 * Uses the shared FFmpeg adapter for binary resolution, temp file management,
 * and process execution — following the adapter pattern in `adapters/tts/`.
 *
 * @module adapters/video/frameExtractor
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import {
  cleanupTempFiles,
  createTrackedTempDir,
  FFMPEG_FRAME_MAX_BUFFER,
  FFMPEG_FRAME_TIMEOUT_MS,
  isValidMp4Buffer,
  JPEG_QUALITY,
  join,
  LAST_FRAME_SEEK_OFFSET,
  readFile,
  runFfmpeg,
  writeFile,
} from "./ffmpegAdapter.js";
import { VIDEO_ERROR_CODES } from "../../constants/videoErrors.js";
import { VideoError } from "./vertexVideoHandler.js";

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Validate a video buffer before FFmpeg processing.
 *
 * @throws {VideoError} If the buffer is empty, too small, or not a valid MP4
 */
function assertValidVideoBuffer(videoBuffer: Buffer, operation: string): void {
  if (!Buffer.isBuffer(videoBuffer) || videoBuffer.length === 0) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_FRAME_EXTRACTION_FAILED,
      message: `Cannot ${operation}: video buffer is empty or not a Buffer`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { operation, bufferSize: videoBuffer?.length ?? 0 },
    });
  }

  if (!isValidMp4Buffer(videoBuffer)) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_FRAME_EXTRACTION_FAILED,
      message: `Cannot ${operation}: buffer does not appear to be a valid MP4 (missing ftyp header)`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: {
        operation,
        bufferSize: videoBuffer.length,
        headerHex: videoBuffer.subarray(0, 12).toString("hex"),
      },
    });
  }
}

/**
 * Core frame extraction logic shared between first/last frame extractors.
 */
async function extractFrame(
  videoBuffer: Buffer,
  position: "first" | "last",
): Promise<Buffer> {
  const startTime = Date.now();
  assertValidVideoBuffer(videoBuffer, `extract ${position} frame`);

  const tempDir = await createTrackedTempDir("frame");
  const inputPath = join(tempDir, "input.mp4");
  const outputPath = join(tempDir, `${position}_frame.jpg`);

  try {
    await writeFile(inputPath, videoBuffer, { mode: 0o600, flag: "wx" });

    const args =
      position === "first"
        ? [
            "-y",
            "-i",
            inputPath,
            "-vframes",
            "1",
            "-q:v",
            JPEG_QUALITY,
            "-f",
            "image2",
            outputPath,
          ]
        : [
            "-y",
            "-sseof",
            `-${LAST_FRAME_SEEK_OFFSET}`,
            "-i",
            inputPath,
            "-update",
            "1",
            "-q:v",
            JPEG_QUALITY,
            "-f",
            "image2",
            outputPath,
          ];

    await runFfmpeg(args, {
      timeoutMs: FFMPEG_FRAME_TIMEOUT_MS,
      maxBuffer: FFMPEG_FRAME_MAX_BUFFER,
    });

    const frameBuffer = await readFile(outputPath);

    logger.debug(`Extracted ${position} frame`, {
      inputSize: videoBuffer.length,
      frameSize: frameBuffer.length,
      elapsedMs: Date.now() - startTime,
    });

    return frameBuffer;
  } catch (error) {
    // Re-throw VideoErrors as-is
    if (error instanceof VideoError) {
      throw error;
    }

    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_FRAME_EXTRACTION_FAILED,
      message: `Failed to extract ${position} frame: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { position, bufferSize: videoBuffer.length },
      originalError: error instanceof Error ? error : undefined,
    });
  } finally {
    await cleanupTempFiles(tempDir, inputPath, outputPath);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Extract the first frame from a video buffer as JPEG.
 *
 * @param videoBuffer - MP4 video buffer
 * @returns JPEG image buffer of the first frame
 * @throws {VideoError} If buffer validation or extraction fails
 */
export async function extractFirstFrame(videoBuffer: Buffer): Promise<Buffer> {
  return extractFrame(videoBuffer, "first");
}

/**
 * Extract the last frame from a video buffer as JPEG.
 *
 * @param videoBuffer - MP4 video buffer
 * @returns JPEG image buffer of the last frame
 * @throws {VideoError} If buffer validation or extraction fails
 */
export async function extractLastFrame(videoBuffer: Buffer): Promise<Buffer> {
  return extractFrame(videoBuffer, "last");
}
