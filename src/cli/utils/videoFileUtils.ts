/**
 * Video file utilities for CLI
 *
 * Provides functionality for saving generated video to files with proper
 * error handling and directory creation. Follows the pattern established
 * by audioFileUtils.ts for TTS output handling.
 *
 * @module cli/utils/videoFileUtils
 */

import fs from "fs";
import path from "path";
import type {
  VideoGenerationResult,
  VideoSaveResult,
} from "../../lib/types/index.js";

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "32 KB", "1.5 MB")
 */
export function formatVideoFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Resolve the output path, handling both absolute and relative paths
 *
 * @param outputPath - User-specified output path
 * @returns Resolved absolute path
 */
export function resolveVideoOutputPath(outputPath: string): string {
  if (path.isAbsolute(outputPath)) {
    return outputPath;
  }
  return path.resolve(process.cwd(), outputPath);
}

/**
 * Ensure parent directories exist, creating them if necessary
 *
 * @param filePath - Full path to the file
 */
export async function ensureVideoDirectoryExists(
  filePath: string,
): Promise<void> {
  const directory = path.dirname(filePath);
  try {
    await fs.promises.access(directory, fs.constants.F_OK);
  } catch {
    // Directory doesn't exist, create it recursively
    await fs.promises.mkdir(directory, { recursive: true });
  }
}

/**
 * Get appropriate file extension for video media type
 *
 * @param mediaType - Video media type
 * @returns File extension (including dot)
 */
export function getVideoExtension(
  mediaType: "video/mp4" | "video/webm",
): string {
  switch (mediaType) {
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    default:
      // Unreachable but kept for runtime safety
      return ".mp4";
  }
}

/**
 * Validate and normalize output path, adding extension if needed
 *
 * If the specified path has no extension or an invalid extension, the appropriate
 * extension (.mp4 or .webm) will be added based on the mediaType.
 * If the extension doesn't match the mediaType (e.g., .webm specified but mediaType
 * is video/mp4), the extension will be replaced to match the actual format.
 *
 * @param outputPath - User-specified output path
 * @param mediaType - Video media type for extension
 * @returns Normalized output path with correct extension
 */
export function normalizeVideoOutputPath(
  outputPath: string,
  mediaType: "video/mp4" | "video/webm" = "video/mp4",
): string {
  const resolvedPath = resolveVideoOutputPath(outputPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const expectedExt = getVideoExtension(mediaType);

  const validExtensions = [".mp4", ".webm"];
  if (!ext || !validExtensions.includes(ext)) {
    return resolvedPath + expectedExt;
  }

  // If extension doesn't match mediaType, replace it
  if (ext !== expectedExt) {
    const basePath = resolvedPath.slice(0, -ext.length);
    return basePath + expectedExt;
  }

  return resolvedPath;
}

/**
 * Format video duration in human-readable format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "4s", "1m 30s")
 */
export function formatVideoDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format video dimensions in human-readable format
 *
 * @param width - Video width in pixels
 * @param height - Video height in pixels
 * @returns Formatted string (e.g., "1920x1080")
 */
export function formatVideoDimensions(width: number, height: number): string {
  return `${width}x${height}`;
}

/**
 * Save generated video result to a file
 *
 * Creates parent directories if they don't exist and handles both
 * absolute and relative paths.
 *
 * @param video - Video generation result containing video buffer
 * @param outputPath - Path where the video should be saved
 * @returns Save result with success status, path, and size
 *
 * @example
 * ```typescript
 * const result = await saveVideoToFile(videoResult, "./output/video.mp4");
 * if (result.success) {
 *   console.log(`Saved to ${result.path} (${formatVideoFileSize(result.size)})`);
 * }
 * ```
 */
export async function saveVideoToFile(
  video: VideoGenerationResult,
  outputPath: string,
): Promise<VideoSaveResult> {
  let normalizedPath = outputPath;
  try {
    // Normalize the output path
    normalizedPath = normalizeVideoOutputPath(outputPath, video.mediaType);

    // Ensure parent directories exist
    await ensureVideoDirectoryExists(normalizedPath);

    // Write the video buffer to file
    await fs.promises.writeFile(normalizedPath, video.data);

    // Get the actual file size
    const stats = await fs.promises.stat(normalizedPath);

    return {
      success: true,
      path: normalizedPath,
      size: stats.size,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      path: normalizedPath,
      size: 0,
      error: errorMessage,
    };
  }
}

/**
 * Type guard to check if an object is a valid VideoGenerationResult
 *
 * @param obj - Object to check
 * @returns True if object is a valid VideoGenerationResult
 */
export function isVideoGenerationResult(
  obj: unknown,
): obj is VideoGenerationResult {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const video = obj as Record<string, unknown>;

  // Check required fields
  if (!(video.data instanceof Buffer)) {
    return false;
  }

  // Check mediaType is valid
  if (video.mediaType !== "video/mp4" && video.mediaType !== "video/webm") {
    return false;
  }

  return true;
}

/**
 * Get video metadata summary for display
 *
 * @param video - Video generation result
 * @returns Formatted metadata summary string
 */
export function getVideoMetadataSummary(video: VideoGenerationResult): string {
  const parts: string[] = [];

  if (video.metadata?.duration) {
    parts.push(`Duration: ${formatVideoDuration(video.metadata.duration)}`);
  }

  if (video.metadata?.dimensions) {
    parts.push(
      `Resolution: ${formatVideoDimensions(video.metadata.dimensions.width, video.metadata.dimensions.height)}`,
    );
  }

  if (video.metadata?.aspectRatio) {
    parts.push(`Aspect: ${video.metadata.aspectRatio}`);
  }

  if (video.metadata?.audioEnabled !== undefined) {
    parts.push(`Audio: ${video.metadata.audioEnabled ? "Yes" : "No"}`);
  }

  if (video.metadata?.processingTime) {
    const seconds = (video.metadata.processingTime / 1000).toFixed(1);
    parts.push(`Processing: ${seconds}s`);
  }

  return parts.join(" | ");
}
