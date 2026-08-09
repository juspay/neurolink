/**
 * Shared FFmpeg Adapter for Video Operations
 *
 * Centralizes FFmpeg binary resolution, process execution, and temporary file
 * management for all video adapter modules (frameExtractor, videoMerger).
 *
 * Follows the adapter pattern used in `src/lib/adapters/tts/` and
 * `src/lib/adapters/providerImageAdapter.ts`.
 *
 * @module adapters/video/ffmpegAdapter
 */

import { randomUUID } from "node:crypto";
import { readdirSync, rmdirSync, unlinkSync } from "node:fs";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../../utils/logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Timeout for frame-extraction FFmpeg operations (30 seconds) */
export const FFMPEG_FRAME_TIMEOUT_MS = 30_000;

/** Timeout for merge/concat FFmpeg operations (2 minutes) */
export const FFMPEG_MERGE_TIMEOUT_MS = 120_000;

/** Max stdout/stderr buffer for frame extraction (10 MB) */
export const FFMPEG_FRAME_MAX_BUFFER = 10 * 1024 * 1024;

/** Max stdout/stderr buffer for merge operations (50 MB) */
export const FFMPEG_MERGE_MAX_BUFFER = 50 * 1024 * 1024;

/** FFmpeg JPEG quality scale (2 = high quality, range 2-31) */
export const JPEG_QUALITY = "2";

/** Seconds before end-of-video to seek when extracting last frame */
export const LAST_FRAME_SEEK_OFFSET = "0.5";

/** Minimum valid MP4 buffer size in bytes (ftyp header = 8 bytes minimum) */
export const MIN_VIDEO_BUFFER_SIZE = 12;

/** MP4 ftyp box magic bytes at offset 4: "ftyp" */
const FTYP_MAGIC = Buffer.from([0x66, 0x74, 0x79, 0x70]);

// ============================================================================
// TEMP DIRECTORY MANAGEMENT
// ============================================================================

/** Track active temp directories for process cleanup */
const activeTempDirs = new Set<string>();
let cleanupRegistered = false;

/**
 * Register process-level cleanup handlers once.
 * Removes all tracked temp directories on abnormal exit.
 */
function ensureCleanupRegistered(): void {
  if (cleanupRegistered) {
    return;
  }
  cleanupRegistered = true;

  const cleanup = () => {
    for (const dir of activeTempDirs) {
      try {
        // Sync removal for exit handlers — best-effort only
        const entries = readdirSync(dir);
        for (const entry of entries) {
          try {
            unlinkSync(join(dir, entry));
          } catch {
            /* best-effort */
          }
        }
        rmdirSync(dir);
      } catch {
        /* best-effort */
      }
    }
    activeTempDirs.clear();
  };

  process.on("exit", cleanup);
}

/**
 * Create a tracked temporary directory for FFmpeg operations.
 *
 * @param prefix - Directory name prefix (e.g. "frame", "merge")
 * @returns Absolute path to the created directory
 */
export async function createTrackedTempDir(prefix: string): Promise<string> {
  ensureCleanupRegistered();
  const dir = join(tmpdir(), `neurolink-${prefix}-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  activeTempDirs.add(dir);
  return dir;
}

/**
 * Clean up temporary files and their parent directory.
 * Logs failures at debug level instead of swallowing silently.
 *
 * @param tempDir - The temporary directory to remove
 * @param files - File paths within tempDir to delete
 */
export async function cleanupTempFiles(
  tempDir: string,
  ...files: string[]
): Promise<void> {
  for (const filePath of files) {
    try {
      await unlink(filePath);
    } catch (err) {
      logger.debug("Failed to clean up temp file", {
        path: filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    logger.debug("Failed to remove temp directory", {
      path: tempDir,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  activeTempDirs.delete(tempDir);
}

// ============================================================================
// FFMPEG BINARY RESOLUTION
// ============================================================================

/** Cached FFmpeg binary path to avoid repeated resolution */
let cachedFfmpegPath: string | null = null;

/**
 * Resolve the FFmpeg binary path.
 *
 * Resolution order:
 * 1. `FFMPEG_PATH` environment variable
 * 2. `ffmpeg-static` npm package (optional peer dependency)
 * 3. System `ffmpeg` on PATH
 *
 * @returns Absolute or relative path to the FFmpeg binary
 */
export async function getFfmpegPath(): Promise<string> {
  if (cachedFfmpegPath) {
    return cachedFfmpegPath;
  }

  if (process.env.FFMPEG_PATH) {
    cachedFfmpegPath = process.env.FFMPEG_PATH;
    return cachedFfmpegPath;
  }

  try {
    const ffmpegStatic = await import("ffmpeg-static" as string);
    const staticPath =
      (ffmpegStatic as { default?: string }).default ?? ffmpegStatic;
    if (typeof staticPath === "string" && staticPath.length > 0) {
      cachedFfmpegPath = staticPath;
      return cachedFfmpegPath;
    }
  } catch {
    // ffmpeg-static not installed — fall through to system binary
    logger.debug("ffmpeg-static not available, using system ffmpeg binary");
  }

  cachedFfmpegPath = "ffmpeg";
  logger.warn(
    "Using system ffmpeg binary. If video operations fail with ENOENT, install ffmpeg-static or set FFMPEG_PATH.",
  );
  return cachedFfmpegPath;
}

// ============================================================================
// FFMPEG PROCESS EXECUTION
// ============================================================================

/**
 * Run an FFmpeg command via `child_process.execFile`.
 *
 * @param args - FFmpeg CLI arguments (without the binary path)
 * @param options - Timeout and buffer size overrides
 * @returns stdout and stderr from the process
 * @throws Error if the process exits with a non-zero code or times out
 */
export async function runFfmpeg(
  args: string[],
  options: {
    timeoutMs?: number;
    maxBuffer?: number;
    /**
     * Override the resolved binary. Used to retry against the system `ffmpeg`
     * when the `ffmpeg-static` build lacks a codec — its LGPL build ships
     * without HEVC, so it cannot decode HEIC even though a system build can.
     */
    binaryPath?: string;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { execFile } = await import("node:child_process");
  const ffmpegPath = options.binaryPath ?? (await getFfmpegPath());
  const timeoutMs = options.timeoutMs ?? FFMPEG_FRAME_TIMEOUT_MS;
  const maxBuffer = options.maxBuffer ?? FFMPEG_FRAME_MAX_BUFFER;

  return new Promise((resolve, reject) => {
    const proc = execFile(
      ffmpegPath,
      args,
      { timeout: timeoutMs, maxBuffer },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout: stdout || "", stderr: stderr || "" });
        }
      },
    );
    proc.on("error", reject);
  });
}

// ============================================================================
// BUFFER VALIDATION
// ============================================================================

/**
 * Validate that a buffer looks like a valid MP4 video.
 *
 * Checks minimum size and the presence of an `ftyp` box header.
 *
 * @param buffer - Buffer to validate
 * @returns `true` if the buffer passes basic MP4 validation
 */
export function isValidMp4Buffer(buffer: Buffer): boolean {
  if (buffer.length < MIN_VIDEO_BUFFER_SIZE) {
    return false;
  }

  // Check for ftyp box: bytes 4-7 should be "ftyp"
  return buffer.subarray(4, 8).equals(FTYP_MAGIC);
}

// ============================================================================
// FILE I/O HELPERS
// ============================================================================

export { writeFile, readFile, join };
