/**
 * Audio file utilities for CLI
 *
 * Provides functionality for saving TTS audio to files with proper
 * error handling and directory creation.
 *
 * @module cli/utils/audioFileUtils
 */

import fs from "fs";
import path from "path";
import type {
  TTSResult,
  AudioSaveResult,
  AudioFormat,
} from "../../lib/types/ttsTypes.js";

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "32 KB", "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
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
export function resolveOutputPath(outputPath: string): string {
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
export async function ensureDirectoryExists(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  try {
    await fs.promises.access(directory, fs.constants.F_OK);
  } catch {
    // Directory doesn't exist, create it recursively
    await fs.promises.mkdir(directory, { recursive: true });
  }
}

/**
 * Get appropriate file extension for audio format
 *
 * @param format - Audio format
 * @returns File extension (including dot)
 */
export function getAudioExtension(format: AudioFormat): string {
  switch (format) {
    case "mp3":
      return ".mp3";
    case "wav":
      return ".wav";
    case "ogg":
      return ".ogg";
    case "opus":
      return ".opus";
    default:
      return ".mp3";
  }
}

/**
 * Validate and normalize output path, adding extension if needed
 *
 * @param outputPath - User-specified output path
 * @param format - Audio format for extension
 * @returns Normalized output path
 */
export function normalizeOutputPath(
  outputPath: string,
  format: AudioFormat = "mp3",
): string {
  const resolvedPath = resolveOutputPath(outputPath);
  const ext = path.extname(resolvedPath).toLowerCase();

  // If no extension or wrong extension, add the correct one
  const validExtensions = [".mp3", ".wav", ".ogg", ".opus"];
  if (!ext || !validExtensions.includes(ext)) {
    return resolvedPath + getAudioExtension(format);
  }

  return resolvedPath;
}

/**
 * Save TTS audio result to a file
 *
 * Creates parent directories if they don't exist and handles both
 * absolute and relative paths.
 *
 * @param audio - TTS result containing audio buffer
 * @param outputPath - Path where the audio should be saved
 * @returns Save result with success status, path, and size
 *
 * @example
 * ```typescript
 * const result = await saveAudioToFile(audioResult, "./output/audio.mp3");
 * if (result.success) {
 *   console.log(`Saved to ${result.path} (${formatFileSize(result.size)})`);
 * }
 * ```
 */
export async function saveAudioToFile(
  audio: TTSResult,
  outputPath: string,
): Promise<AudioSaveResult> {
  try {
    // Normalize the output path
    const normalizedPath = normalizeOutputPath(outputPath, audio.format);

    // Ensure parent directories exist
    await ensureDirectoryExists(normalizedPath);

    // Write the audio buffer to file
    await fs.promises.writeFile(normalizedPath, audio.buffer);

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
      path: outputPath,
      size: 0,
      error: errorMessage,
    };
  }
}

/**
 * Validate that a path is writable
 *
 * @param filePath - Path to validate
 * @returns True if the path is writable
 */
export async function isPathWritable(filePath: string): Promise<boolean> {
  try {
    const resolvedPath = resolveOutputPath(filePath);
    const directory = path.dirname(resolvedPath);

    // Check if directory exists
    try {
      await fs.promises.access(directory, fs.constants.W_OK);
      return true;
    } catch {
      // Directory doesn't exist, check if we can create it
      // by checking write access to the nearest existing parent
      let parentDir = directory;
      while (parentDir !== path.dirname(parentDir)) {
        try {
          await fs.promises.access(parentDir, fs.constants.W_OK);
          return true;
        } catch {
          parentDir = path.dirname(parentDir);
        }
      }
      return false;
    }
  } catch {
    return false;
  }
}
