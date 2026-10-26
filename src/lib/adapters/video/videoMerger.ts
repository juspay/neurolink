/**
 * Video Merger for Director Mode
 *
 * Concatenates multiple MP4 video buffers into a single MP4 using FFmpeg's
 * concat demuxer for lossless concatenation when codecs match.
 *
 * Uses the shared FFmpeg adapter for binary resolution, temp file management,
 * and process execution — following the adapter pattern in `adapters/tts/`.
 *
 * @module adapters/video/videoMerger
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import {
  cleanupTempFiles,
  createTrackedTempDir,
  FFMPEG_MERGE_MAX_BUFFER,
  FFMPEG_MERGE_TIMEOUT_MS,
  isValidMp4Buffer,
  join,
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
 * Write clip buffers to temp files and build the FFmpeg concat list.
 *
 * @returns Paths of all written clip files
 */
async function writeClipsAndBuildConcatList(
  videoBuffers: Buffer[],
  tempDir: string,
  concatListPath: string,
): Promise<string[]> {
  const inputPaths: string[] = [];
  const concatLines: string[] = [];

  for (let i = 0; i < videoBuffers.length; i++) {
    const inputPath = join(tempDir, `clip_${i}.mp4`);
    await writeFile(inputPath, videoBuffers[i], { mode: 0o600, flag: "wx" });
    inputPaths.push(inputPath);
    // Normalize backslashes to forward slashes for FFmpeg, then escape single quotes
    const safePath = inputPath.replace(/\\/g, "/").replace(/'/g, "'\\''");
    concatLines.push(`file '${safePath}'`);
  }

  await writeFile(concatListPath, concatLines.join("\n"), {
    mode: 0o600,
    flag: "wx",
  });
  return inputPaths;
}

/**
 * Attempt lossless concat, falling back to H.264 re-encode on failure.
 */
async function concatWithFallback(
  concatListPath: string,
  outputPath: string,
): Promise<void> {
  const ffmpegOpts = {
    timeoutMs: FFMPEG_MERGE_TIMEOUT_MS,
    maxBuffer: FFMPEG_MERGE_MAX_BUFFER,
  };

  try {
    // Try lossless concat first (fastest — no re-encoding)
    await runFfmpeg(
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c",
        "copy",
        outputPath,
      ],
      ffmpegOpts,
    );
  } catch (concatError) {
    // Fallback: re-encode with H.264 if codecs mismatch
    logger.warn("Lossless concat failed, falling back to H.264 re-encoding", {
      error:
        concatError instanceof Error
          ? concatError.message
          : String(concatError),
    });

    await runFfmpeg(
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatListPath,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      ffmpegOpts,
    );
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Merge multiple MP4 video buffers into a single MP4.
 *
 * Uses FFmpeg concat demuxer for lossless concatenation. If codecs don't match
 * (unlikely since all clips come from Veo), falls back to re-encoding with H.264.
 *
 * @param videoBuffers - Array of MP4 video buffers to concatenate in order
 * @returns Merged MP4 video buffer
 * @throws {VideoError} If merge fails or no valid buffers provided
 */
export async function mergeVideoBuffers(
  videoBuffers: Buffer[],
): Promise<Buffer> {
  if (videoBuffers.length === 0) {
    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_MERGE_FAILED,
      message: "No video buffers provided to merge",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
    });
  }

  // Validate each input buffer
  for (let i = 0; i < videoBuffers.length; i++) {
    if (!isValidMp4Buffer(videoBuffers[i])) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.DIRECTOR_MERGE_FAILED,
        message: `Clip ${i} is not a valid MP4 buffer (missing ftyp header or too small)`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: {
          clipIndex: i,
          bufferSize: videoBuffers[i].length,
          headerHex: videoBuffers[i].subarray(0, 12).toString("hex"),
        },
      });
    }
  }

  if (videoBuffers.length === 1) {
    return videoBuffers[0];
  }

  const startTime = Date.now();
  const tempDir = await createTrackedTempDir("merge");
  const concatListPath = join(tempDir, "concat.txt");
  const outputPath = join(tempDir, "merged.mp4");
  let inputPaths: string[] = [];

  try {
    inputPaths = await writeClipsAndBuildConcatList(
      videoBuffers,
      tempDir,
      concatListPath,
    );

    await concatWithFallback(concatListPath, outputPath);

    const mergedBuffer = await readFile(outputPath);

    logger.info("Video merge complete", {
      inputClips: videoBuffers.length,
      totalInputSize: videoBuffers.reduce((sum, b) => sum + b.length, 0),
      outputSize: mergedBuffer.length,
      elapsedMs: Date.now() - startTime,
    });

    return mergedBuffer;
  } catch (error) {
    // Re-throw VideoErrors as-is
    if (error instanceof VideoError) {
      throw error;
    }

    throw new VideoError({
      code: VIDEO_ERROR_CODES.DIRECTOR_MERGE_FAILED,
      message: `Video merge failed: ${error instanceof Error ? error.message : String(error)}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { clipCount: videoBuffers.length },
      originalError: error instanceof Error ? error : undefined,
    });
  } finally {
    await cleanupTempFiles(tempDir, concatListPath, outputPath, ...inputPaths);
  }
}
