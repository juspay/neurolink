/**
 * Video Processor
 *
 * Handles downloading, validating, and processing video files for AI consumption.
 * Since LLMs cannot process raw video, this processor extracts:
 * - Structured metadata (duration, resolution, codecs, etc.)
 * - Keyframes at configurable intervals (resized to 768px JPEG)
 * - Embedded subtitle tracks (if present)
 *
 * The extracted content is formatted as text + images that can be sent to any
 * AI provider for analysis.
 *
 * Uses fluent-ffmpeg for video processing and sharp for frame resizing.
 * Requires ffmpeg/ffprobe to be available (via ffmpeg-static or system PATH).
 *
 * Key features:
 * - Adaptive keyframe extraction intervals based on video duration
 * - Frame count capping (max 20 frames) to control token usage
 * - JPEG quality optimization for AI vision models
 * - Embedded subtitle extraction (SRT format)
 * - Graceful degradation on corrupt files or missing codecs
 * - Temp file cleanup with finally blocks
 * - Configurable timeouts for ffmpeg and ffprobe operations
 *
 * @module processors/media/VideoProcessor
 *
 * @example
 * ```typescript
 * import { videoProcessor, processVideo, isVideoFile } from "./VideoProcessor.js";
 *
 * // Check if a file is a video file
 * if (isVideoFile(fileInfo.mimetype, fileInfo.name)) {
 *   const result = await processVideo(fileInfo, {
 *     authHeaders: { Authorization: "Bearer token" },
 *   });
 *
 *   if (result.success) {
 *     console.log(`Duration: ${result.data.metadata.durationFormatted}`);
 *     console.log(`Keyframes: ${result.data.frameCount}`);
 *     console.log(`Text for LLM:\n${result.data.textContent}`);
 *   }
 * }
 * ```
 */

import { randomUUID } from "crypto";
import type { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import ffmpegCommand from "fluent-ffmpeg";
import { createWriteStream, existsSync, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessedFileBase,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import { FileErrorCode } from "../errors/index.js";

// =============================================================================
// FFMPEG PATH INITIALIZATION
// =============================================================================

/**
 * Whether ffmpeg/ffprobe paths have been initialized.
 * We only attempt path resolution once to avoid repeated dynamic import overhead.
 */
let ffmpegPathInitialized = false;

/**
 * Initialize ffmpeg and ffprobe binary paths.
 * Tries ffmpeg-static/ffprobe-static first, falls back to system binaries in PATH.
 *
 * This is called lazily on the first processFile() invocation so that the module
 * can be imported without side effects.
 */
async function initFfmpegPaths(): Promise<void> {
  if (ffmpegPathInitialized) {
    return;
  }
  ffmpegPathInitialized = true;

  // Try ffmpeg-static first, fall back to system ffmpeg.
  // IMPORTANT: Verify the binary actually exists before setting the path.
  // On some platforms (e.g., macOS ARM), ffmpeg-static installs the npm package
  // but the pre-built binary download fails silently, leaving a non-existent path.
  // If we set a bad path, ffmpeg commands fail with ENOENT instead of using
  // the perfectly good system ffmpeg in PATH.
  try {
    const ffmpegStatic = await import("ffmpeg-static");
    const ffmpegPath: unknown = ffmpegStatic.default;
    if (typeof ffmpegPath === "string" && existsSync(ffmpegPath)) {
      ffmpegCommand.setFfmpegPath(ffmpegPath);
    }
  } catch {
    // Use system ffmpeg (already in PATH)
  }

  // Try ffprobe-static first, fall back to system ffprobe
  try {
    const ffprobeStatic: Record<string, unknown> = (await import(
      "ffprobe-static"
    )) as Record<string, unknown>;
    // Direct path property (CommonJS default)
    if (
      typeof ffprobeStatic["path"] === "string" &&
      existsSync(ffprobeStatic["path"] as string)
    ) {
      ffmpegCommand.setFfprobePath(ffprobeStatic["path"] as string);
    } else if (
      ffprobeStatic["default"] &&
      typeof ffprobeStatic["default"] === "object" &&
      typeof (ffprobeStatic["default"] as Record<string, unknown>)["path"] ===
        "string"
    ) {
      const probePath = (ffprobeStatic["default"] as Record<string, string>)[
        "path"
      ];
      if (existsSync(probePath)) {
        ffmpegCommand.setFfprobePath(probePath);
      }
    }
  } catch {
    // Use system ffprobe (already in PATH)
  }
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Processed video result.
 * Extends ProcessedFileBase with video-specific fields including metadata,
 * extracted keyframes, subtitle text, and a pre-formatted textContent block
 * suitable for sending to an LLM.
 */
export type ProcessedVideo = ProcessedFileBase & {
  /** Pre-formatted text description for the LLM (metadata + subtitles summary) */
  textContent: string;
  /** Extracted keyframes as JPEG buffers (resized to max 768px dimension) */
  keyframes: Buffer[];
  /** Video metadata extracted via ffprobe */
  metadata: {
    /** Duration in seconds */
    duration: number;
    /** Human-readable duration (e.g., "2m 30s") */
    durationFormatted: string;
    /** Video width in pixels */
    width: number;
    /** Video height in pixels */
    height: number;
    /** Video codec name (e.g., "h264", "vp9") */
    codec: string;
    /** Frames per second */
    fps: number;
    /** Video bitrate in bits/second */
    bitrate: number;
    /** Audio codec name if present */
    audioCodec?: string;
    /** Number of audio channels */
    audioChannels?: number;
    /** Audio sample rate in Hz */
    audioSampleRate?: number;
    /** Number of subtitle tracks found */
    subtitleTracks: number;
    /** Original file size in bytes */
    fileSize: number;
  };
  /** Extracted subtitle text (combined from all subtitle tracks) */
  subtitleText?: string;
  /** Whether any keyframes were successfully extracted */
  hasKeyframes: boolean;
  /** Number of keyframes extracted */
  frameCount: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Video processing configuration constants.
 * Controls frame extraction behavior, quality, and timeout limits.
 */
const VIDEO_CONFIG = {
  /** Maximum number of keyframes to extract from a video */
  MAX_FRAMES: 100,
  /**
   * Frame extraction intervals based on video duration.
   * Shorter videos get more frequent frames; longer videos use wider intervals.
   */
  FRAME_INTERVALS: [
    { maxDuration: 10, intervalSec: 1 }, // 10s → up to 10 frames
    { maxDuration: 30, intervalSec: 2 }, // 30s → up to 15 frames
    { maxDuration: 120, intervalSec: 3 }, // 2min → up to 40 frames
    { maxDuration: 600, intervalSec: 6 }, // 10min → up to 100 frames
    { maxDuration: 1800, intervalSec: 20 }, // 30min → up to 90 frames
    { maxDuration: Infinity, intervalSec: 60 }, // >30min → adaptive kicks in
  ] as const,
  /** Maximum dimension (width or height) for extracted keyframes in pixels */
  FRAME_MAX_DIMENSION: 768,
  /** JPEG quality for extracted keyframes (0-100) */
  FRAME_JPEG_QUALITY: 80,
  /** Timeout for ffmpeg frame extraction / subtitle extraction in milliseconds */
  FFMPEG_TIMEOUT_MS: 120_000,
  /** Timeout for ffprobe metadata extraction in milliseconds */
  FFPROBE_TIMEOUT_MS: 10_000,
} as const;

/** Supported video MIME types */
const SUPPORTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/x-matroska",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/3gpp",
  "video/3gpp2",
  "video/MP2T",
  "video/ogg",
] as const;

/** Supported video file extensions */
const SUPPORTED_VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".mkv",
  ".mov",
  ".avi",
  ".wmv",
  ".flv",
  ".webm",
  ".3gp",
  ".3g2",
  ".ts",
  ".mts",
  ".m2ts",
  ".ogv",
  ".vob",
] as const;

/**
 * Maximum video file size in MB.
 * Uses VIDEO_MAX_MB (500 MB) to support long meeting recordings and screen captures.
 */
const VIDEO_MAX_SIZE_MB = SIZE_LIMITS_MB.VIDEO_MAX_MB;

/** Default timeout for video download (2 minutes for larger files) */
const VIDEO_DOWNLOAD_TIMEOUT_MS = 120_000;

// =============================================================================
// VIDEO PROCESSOR CLASS
// =============================================================================

/**
 * Video Processor - extracts metadata, keyframes, and subtitles from video files.
 *
 * Since LLMs cannot process raw video, this processor converts videos into
 * a structured representation consisting of:
 * 1. Text metadata block (duration, resolution, codecs, etc.)
 * 2. Keyframe images (JPEG, resized to 768px max dimension)
 * 3. Subtitle text (if embedded in the video)
 *
 * The processor uses a temp file approach because ffmpeg requires file paths
 * for most operations. Temp files are always cleaned up in finally blocks.
 *
 * @example
 * ```typescript
 * const processor = new VideoProcessor();
 * const result = await processor.processFile({
 *   id: "video-1",
 *   name: "presentation.mp4",
 *   mimetype: "video/mp4",
 *   size: 15_000_000,
 *   buffer: videoBuffer,
 * });
 *
 * if (result.success) {
 *   // result.data.textContent - text description for LLM
 *   // result.data.keyframes   - array of JPEG buffers
 *   // result.data.subtitleText - extracted subtitles (if any)
 * }
 * ```
 */
export class VideoProcessor extends BaseFileProcessor<ProcessedVideo> {
  constructor() {
    super({
      maxSizeMB: VIDEO_MAX_SIZE_MB,
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
      supportedMimeTypes: [...SUPPORTED_VIDEO_MIME_TYPES],
      supportedExtensions: [...SUPPORTED_VIDEO_EXTENSIONS],
      fileTypeName: "video",
      defaultFilename: "video.mp4",
    });
  }

  // ===========================================================================
  // ABSTRACT METHOD IMPLEMENTATION
  // ===========================================================================

  /**
   * Build processed result stub.
   * This is a synchronous placeholder - actual processing happens in the
   * overridden processFile method since ffmpeg operations are asynchronous
   * and require temp file I/O.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Empty ProcessedVideo structure
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedVideo {
    return {
      buffer,
      mimetype: fileInfo.mimetype || "video/mp4",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
      textContent: "",
      keyframes: [],
      metadata: {
        duration: 0,
        durationFormatted: "0s",
        width: 0,
        height: 0,
        codec: "unknown",
        fps: 0,
        bitrate: 0,
        subtitleTracks: 0,
        fileSize: fileInfo.size,
      },
      hasKeyframes: false,
      frameCount: 0,
    };
  }

  // ===========================================================================
  // MAIN PROCESSING OVERRIDE
  // ===========================================================================

  /**
   * Override processFile for async video processing with ffmpeg.
   *
   * Processing pipeline:
   * 1. Validate file type and size
   * 2. Get buffer (from fileInfo.buffer or download from URL)
   * 3. Write buffer to temp file (ffmpeg requires file paths)
   * 4. Extract metadata using ffprobe
   * 5. Extract keyframes at calculated intervals, resize with sharp
   * 6. Extract subtitle tracks if embedded
   * 7. Build textContent summary for LLM
   * 8. Clean up temp files
   *
   * @param fileInfo - File information with URL or buffer
   * @param options - Optional processing options
   * @returns Processing result with extracted video data or error
   */
  override async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<FileProcessingResult<ProcessedVideo>> {
    // Ensure ffmpeg paths are initialized before any processing
    await initFfmpegPaths();

    // Temp directory for this processing run
    const tempDir = join(tmpdir(), `neurolink-video-${randomUUID()}`);
    let tempCreated = false;

    try {
      // Step 1: Validate file type and size
      const validationResult = this.validateFileWithResult(fileInfo);
      if (!validationResult.success) {
        return { success: false, error: validationResult.error };
      }

      // Step 2: Get file buffer
      let buffer: Buffer;

      if (fileInfo.buffer) {
        buffer = fileInfo.buffer;
      } else if (fileInfo.url) {
        const downloadResult = await this.downloadFileWithRetry(
          fileInfo,
          options,
        );
        if (!downloadResult.success) {
          return { success: false, error: downloadResult.error };
        }
        if (!downloadResult.data) {
          return {
            success: false,
            error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
              reason: "Download succeeded but returned no data",
            }),
          };
        }
        buffer = downloadResult.data;

        // Validate actual downloaded size
        if (!this.validateFileSize(buffer.length)) {
          return {
            success: false,
            error: this.createError(FileErrorCode.FILE_TOO_LARGE, {
              sizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
              maxMB: this.config.maxSizeMB,
              type: this.config.fileTypeName,
            }),
          };
        }
      } else {
        return {
          success: false,
          error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
            reason: "No buffer or URL provided for file",
          }),
        };
      }

      // Step 3: Write buffer to temp file (ffmpeg needs a file path)
      await fs.mkdir(tempDir, { recursive: true });
      tempCreated = true;

      const extension = this.getExtensionFromFileInfo(fileInfo);
      const tempVideoPath = join(tempDir, `input${extension}`);
      await this.writeBufferToFile(buffer, tempVideoPath);

      // Step 4: Extract metadata via ffprobe
      const probeResult = await this.probeVideo(tempVideoPath);
      if (!probeResult.success) {
        return {
          success: false,
          error: this.createError(FileErrorCode.PROCESSING_FAILED, {
            fileType: "video",
            reason: probeResult.error,
          }),
        };
      }
      const probeData = probeResult.data as NonNullable<
        typeof probeResult.data
      >;
      const metadata = this.buildMetadata(probeData, buffer.length);

      // Step 5: Extract keyframes
      let keyframes: Buffer[] = [];
      try {
        keyframes = await this.extractKeyframes(
          tempVideoPath,
          tempDir,
          metadata.duration,
        );
      } catch {
        // Non-fatal: continue without keyframes if extraction fails
        // (e.g., audio-only file in a video container)
      }

      // Step 6: Extract subtitles
      let subtitleText: string | undefined;
      if (metadata.subtitleTracks > 0) {
        try {
          subtitleText = await this.extractSubtitles(tempVideoPath, tempDir);
        } catch {
          // Non-fatal: continue without subtitles if extraction fails
        }
      }

      // Step 7: Build textContent for LLM
      const textContent = this.buildTextContent(
        metadata,
        keyframes.length,
        subtitleText,
        this.getFilename(fileInfo),
      );

      // Step 8: Return structured result
      return {
        success: true,
        data: {
          buffer,
          mimetype: fileInfo.mimetype || "video/mp4",
          size: fileInfo.size,
          filename: this.getFilename(fileInfo),
          textContent,
          keyframes,
          metadata,
          subtitleText,
          hasKeyframes: keyframes.length > 0,
          frameCount: keyframes.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError(
          FileErrorCode.PROCESSING_FAILED,
          {
            fileType: "video",
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined,
        ),
      };
    } finally {
      // Step 8: Clean up temp files
      if (tempCreated) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
          // Ignore cleanup errors - temp files will be cleaned by OS eventually
        });
      }
    }
  }

  // ===========================================================================
  // METADATA EXTRACTION
  // ===========================================================================

  /**
   * Probe a video file to extract metadata using ffprobe.
   *
   * @param filePath - Path to the video file
   * @returns Success result with probe data or error message
   */
  private probeVideo(
    filePath: string,
  ): Promise<{ success: boolean; data?: FfprobeData; error?: string }> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `ffprobe timed out after ${VIDEO_CONFIG.FFPROBE_TIMEOUT_MS}ms`,
        });
      }, VIDEO_CONFIG.FFPROBE_TIMEOUT_MS);

      ffmpegCommand.ffprobe(filePath, (err, data) => {
        clearTimeout(timeoutId);
        if (err) {
          resolve({
            success: false,
            error: `ffprobe failed: ${err.message}`,
          });
        } else {
          resolve({ success: true, data });
        }
      });
    });
  }

  /**
   * Build a structured metadata object from ffprobe data.
   *
   * @param probeData - Raw ffprobe output
   * @param fileSize - Original file size in bytes
   * @returns Structured video metadata
   */
  private buildMetadata(
    probeData: FfprobeData,
    fileSize: number,
  ): ProcessedVideo["metadata"] {
    const videoStream = probeData.streams.find(
      (s: FfprobeStream) => s.codec_type === "video",
    );
    const audioStream = probeData.streams.find(
      (s: FfprobeStream) => s.codec_type === "audio",
    );
    const subtitleStreams = probeData.streams.filter(
      (s: FfprobeStream) => s.codec_type === "subtitle",
    );

    const duration = probeData.format?.duration
      ? parseFloat(String(probeData.format.duration))
      : 0;

    // Parse FPS from r_frame_rate (e.g., "30000/1001" or "25/1")
    let fps = 0;
    if (videoStream?.r_frame_rate) {
      const parts = String(videoStream.r_frame_rate).split("/");
      if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (den > 0) {
          fps = Math.round((num / den) * 100) / 100;
        }
      } else {
        fps = parseFloat(parts[0]) || 0;
      }
    }

    return {
      duration,
      durationFormatted: this.formatDuration(duration),
      width: videoStream?.width ?? 0,
      height: videoStream?.height ?? 0,
      codec: videoStream?.codec_name ?? "unknown",
      fps,
      bitrate: probeData.format?.bit_rate
        ? parseInt(String(probeData.format.bit_rate), 10)
        : 0,
      audioCodec: audioStream?.codec_name,
      audioChannels: audioStream?.channels,
      audioSampleRate: audioStream?.sample_rate
        ? parseInt(String(audioStream.sample_rate), 10)
        : undefined,
      subtitleTracks: subtitleStreams.length,
      fileSize,
    };
  }

  // ===========================================================================
  // KEYFRAME EXTRACTION
  // ===========================================================================

  /**
   * Extract keyframes from a video at calculated intervals.
   *
   * The interval between frames is determined by the video duration:
   * - <= 10s:   every 1s  (very short clips — dense coverage)
   * - <= 30s:   every 2s  (short bug clips)
   * - <= 120s:  every 5s  (standard screen recordings)
   * - <= 600s:  every 15s (longer demos)
   * - <= 1800s: every 60s (meeting recordings)
   * - > 1800s:  every 180s (full meetings)
   *
   * Results are capped at MAX_FRAMES (100) and each frame is resized
   * to fit within 768x768px while maintaining aspect ratio.
   * The interval is adaptive: if the tier interval would exceed MAX_FRAMES,
   * the interval widens to duration/MAX_FRAMES for full-video coverage.
   *
   * @param videoPath - Path to the video file
   * @param tempDir - Temp directory for frame output
   * @param durationSec - Video duration in seconds
   * @returns Array of JPEG frame buffers
   */
  private async extractKeyframes(
    videoPath: string,
    tempDir: string,
    durationSec: number,
  ): Promise<Buffer[]> {
    if (durationSec <= 0) {
      return [];
    }

    // Determine extraction interval based on duration
    const intervalSec = this.getFrameInterval(durationSec);

    // Calculate timestamps to extract
    const timestamps: number[] = [];
    for (
      let t = 0;
      t < durationSec && timestamps.length < VIDEO_CONFIG.MAX_FRAMES;
      t += intervalSec
    ) {
      timestamps.push(t);
    }

    if (timestamps.length === 0) {
      // For very short videos, grab at least one frame at t=0
      timestamps.push(0);
    }

    // Extract frames using ffmpeg
    const framesDir = join(tempDir, "frames");
    await fs.mkdir(framesDir, { recursive: true });

    await this.runFfmpegFrameExtraction(videoPath, framesDir, timestamps);

    // Read extracted frames and resize with sharp
    const keyframes: Buffer[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const framePath = join(
        framesDir,
        `frame_${String(i + 1).padStart(4, "0")}.jpg`,
      );
      try {
        await fs.access(framePath);
        const rawFrame = await fs.readFile(framePath);

        // Resize to fit within max dimension while preserving aspect ratio
        const resized = await sharp(rawFrame)
          .resize(
            VIDEO_CONFIG.FRAME_MAX_DIMENSION,
            VIDEO_CONFIG.FRAME_MAX_DIMENSION,
            {
              fit: "inside",
              withoutEnlargement: true,
            },
          )
          .jpeg({ quality: VIDEO_CONFIG.FRAME_JPEG_QUALITY })
          .toBuffer();

        keyframes.push(resized);
      } catch {
        // Skip individual frame on resize/encode failure
      }
    }

    return keyframes;
  }

  /**
   * Run ffmpeg to extract frames at specified timestamps.
   *
   * Uses the `-vf select` filter to pick frames at exact timestamps,
   * which is more efficient than seeking for each frame individually.
   *
   * @param videoPath - Path to the video file
   * @param outputDir - Directory to write frame files
   * @param timestamps - Array of timestamps in seconds
   */
  private runFfmpegFrameExtraction(
    videoPath: string,
    outputDir: string,
    timestamps: number[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build select filter expression: select='eq(n,0)+eq(n,250)+...'
      // Instead, use fps filter for simpler approach - extract at regular intervals
      // using -vf fps=1/interval approach which is more reliable

      // Build timestamp-based filter
      const selectExpr = timestamps
        .map((t) => `gte(t\\,${t})*lt(t\\,${t + 0.5})`)
        .join("+");

      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `ffmpeg frame extraction timed out after ${VIDEO_CONFIG.FFMPEG_TIMEOUT_MS}ms`,
          ),
        );
      }, VIDEO_CONFIG.FFMPEG_TIMEOUT_MS);

      ffmpegCommand(videoPath)
        .outputOptions([
          "-vf",
          `select='${selectExpr}',scale='min(${VIDEO_CONFIG.FRAME_MAX_DIMENSION}\\,iw):-2'`,
          "-vsync",
          "vfr",
          "-q:v",
          "3",
          "-frames:v",
          String(timestamps.length),
        ])
        .output(join(outputDir, "frame_%04d.jpg"))
        .on("end", () => {
          clearTimeout(timeoutId);
          resolve();
        })
        .on("error", (err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Determine the frame extraction interval based on video duration.
   *
   * @param durationSec - Video duration in seconds
   * @returns Interval in seconds between extracted frames
   */
  private getFrameInterval(durationSec: number): number {
    let intervalSec = 180; // fallback
    for (const tier of VIDEO_CONFIG.FRAME_INTERVALS) {
      if (durationSec <= tier.maxDuration) {
        intervalSec = tier.intervalSec;
        break;
      }
    }
    // Adaptive: if the tier interval would produce more frames than MAX_FRAMES,
    // widen the interval so frames are evenly distributed across the full video
    const estimatedFrames = Math.floor(durationSec / intervalSec);
    if (estimatedFrames > VIDEO_CONFIG.MAX_FRAMES) {
      intervalSec = Math.ceil(durationSec / VIDEO_CONFIG.MAX_FRAMES);
    }
    return intervalSec;
  }

  // ===========================================================================
  // SUBTITLE EXTRACTION
  // ===========================================================================

  /**
   * Extract embedded subtitle text from the first subtitle track.
   *
   * Uses ffmpeg to convert the first subtitle stream to SRT format,
   * then strips SRT formatting (timestamps, sequence numbers) to produce
   * plain text.
   *
   * @param videoPath - Path to the video file
   * @param tempDir - Temp directory for subtitle output
   * @returns Extracted subtitle text, or undefined if extraction fails
   */
  private async extractSubtitles(
    videoPath: string,
    tempDir: string,
  ): Promise<string | undefined> {
    const subtitlePath = join(tempDir, "subtitles.srt");

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `ffmpeg subtitle extraction timed out after ${VIDEO_CONFIG.FFMPEG_TIMEOUT_MS}ms`,
          ),
        );
      }, VIDEO_CONFIG.FFMPEG_TIMEOUT_MS);

      ffmpegCommand(videoPath)
        .outputOptions(["-map", "0:s:0", "-c:s", "srt"])
        .output(subtitlePath)
        .on("end", () => {
          clearTimeout(timeoutId);
          resolve();
        })
        .on("error", (err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        })
        .run();
    });

    try {
      const srtContent = await fs.readFile(subtitlePath, "utf-8");
      return this.parseSrtToPlainText(srtContent);
    } catch {
      return undefined;
    }
  }

  /**
   * Parse SRT subtitle content into plain text.
   * Strips sequence numbers, timestamps, and blank lines.
   *
   * @param srt - Raw SRT content
   * @returns Plain text from subtitles
   */
  private parseSrtToPlainText(srt: string): string {
    if (!srt.trim()) {
      return "";
    }

    return srt
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        // Skip empty lines
        if (!trimmed) {
          return false;
        }
        // Skip sequence numbers (pure digits)
        if (/^\d+$/.test(trimmed)) {
          return false;
        }
        // Skip timestamp lines (e.g., "00:01:23,456 --> 00:01:25,789")
        if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(trimmed)) {
          return false;
        }
        return true;
      })
      .map((line) => line.trim())
      .join("\n")
      .trim();
  }

  // ===========================================================================
  // TEXT CONTENT BUILDER
  // ===========================================================================

  /**
   * Build a structured text description of the video for LLM consumption.
   *
   * The output includes:
   * - File name and basic info
   * - Technical metadata (resolution, codec, duration, etc.)
   * - Frame extraction summary
   * - Subtitle text (if available)
   *
   * @param metadata - Extracted video metadata
   * @param frameCount - Number of keyframes extracted
   * @param subtitleText - Extracted subtitle text (if any)
   * @param filename - Original filename
   * @returns Formatted text content for the LLM
   */
  private buildTextContent(
    metadata: ProcessedVideo["metadata"],
    frameCount: number,
    subtitleText: string | undefined,
    filename: string,
  ): string {
    const lines: string[] = [];

    lines.push(`[Video File: ${filename}]`);
    lines.push("");
    lines.push("## Video Metadata");
    lines.push(`- Duration: ${metadata.durationFormatted}`);
    lines.push(`- Resolution: ${metadata.width}x${metadata.height}`);
    lines.push(`- Video Codec: ${metadata.codec}`);
    if (metadata.fps > 0) {
      lines.push(`- Frame Rate: ${metadata.fps} fps`);
    }
    if (metadata.bitrate > 0) {
      lines.push(`- Bitrate: ${(metadata.bitrate / 1000).toFixed(0)} kbps`);
    }
    if (metadata.audioCodec) {
      lines.push(`- Audio Codec: ${metadata.audioCodec}`);
      if (metadata.audioChannels) {
        lines.push(
          `- Audio Channels: ${metadata.audioChannels === 1 ? "mono" : metadata.audioChannels === 2 ? "stereo" : `${metadata.audioChannels}ch`}`,
        );
      }
      if (metadata.audioSampleRate) {
        lines.push(
          `- Audio Sample Rate: ${(metadata.audioSampleRate / 1000).toFixed(1)} kHz`,
        );
      }
    }
    lines.push(
      `- File Size: ${(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB`,
    );

    lines.push("");
    if (frameCount > 0) {
      const intervalSec = this.getFrameInterval(metadata.duration);
      lines.push(
        `## Keyframes (${frameCount} frames extracted every ~${intervalSec}s)`,
      );
      lines.push(
        "The following images are keyframes extracted from the video at regular intervals.",
      );
    } else {
      lines.push("## Keyframes");
      lines.push(
        "No keyframes could be extracted from this video (it may be audio-only or use an unsupported codec).",
      );
    }

    if (subtitleText) {
      lines.push("");
      lines.push("## Subtitles / Captions");
      // Truncate very long subtitle text to avoid blowing up context
      const maxSubtitleChars = 10_000;
      if (subtitleText.length > maxSubtitleChars) {
        lines.push(
          subtitleText.substring(0, maxSubtitleChars) +
            `\n... [truncated, ${subtitleText.length - maxSubtitleChars} more characters]`,
        );
      } else {
        lines.push(subtitleText);
      }
    }

    return lines.join("\n");
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Format a duration in seconds to a human-readable string.
   *
   * @param seconds - Duration in seconds
   * @returns Formatted string (e.g., "1h 23m 45s")
   */
  private formatDuration(seconds: number): string {
    if (seconds <= 0) {
      return "0s";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs}s`);
    }

    return parts.join(" ");
  }

  /**
   * Get a file extension from FileInfo, falling back to ".mp4".
   *
   * @param fileInfo - File information
   * @returns File extension with leading dot
   */
  private getExtensionFromFileInfo(fileInfo: FileInfo): string {
    const name = fileInfo.name || "";
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex >= 0) {
      return name.substring(dotIndex).toLowerCase();
    }
    // Fallback: derive from MIME type
    const mimeExtMap: Record<string, string> = {
      "video/mp4": ".mp4",
      "video/x-matroska": ".mkv",
      "video/quicktime": ".mov",
      "video/webm": ".webm",
      "video/x-msvideo": ".avi",
      "video/x-ms-wmv": ".wmv",
      "video/x-flv": ".flv",
      "video/3gpp": ".3gp",
      "video/3gpp2": ".3g2",
      "video/MP2T": ".ts",
      "video/ogg": ".ogv",
    };
    return mimeExtMap[fileInfo.mimetype] || ".mp4";
  }

  /**
   * Write a buffer to a file using streaming to handle large files efficiently.
   *
   * @param buffer - Buffer to write
   * @param filePath - Destination file path
   */
  private async writeBufferToFile(
    buffer: Buffer,
    filePath: string,
  ): Promise<void> {
    const readable = Readable.from(buffer);
    const writable = createWriteStream(filePath);
    await pipeline(readable, writable);
  }

  // ===========================================================================
  // TARGETED EXTRACTION API
  // ===========================================================================

  /**
   * Extract frames from a specific time range in a video.
   *
   * This is the on-demand extraction method called by the `extract_file_content`
   * tool. Unlike initial keyframe extraction (which covers the full video),
   * this targets a specific time window with configurable frame count.
   *
   * @param buffer - Video file buffer
   * @param filename - Original filename (for extension detection)
   * @param startSec - Start time in seconds
   * @param endSec - End time in seconds
   * @param frameCount - Number of frames to extract in the range (default: 5)
   * @returns Array of JPEG frame buffers
   */
  async extractFrameRange(
    buffer: Buffer,
    filename: string,
    startSec: number,
    endSec: number,
    frameCount: number = 5,
  ): Promise<Buffer[]> {
    await initFfmpegPaths();

    const tempDir = join(tmpdir(), `neurolink-video-extract-${randomUUID()}`);
    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Write buffer to temp file
      const ext = this.guessExtensionFromName(filename);
      const tempVideoPath = join(tempDir, `input${ext}`);
      await this.writeBufferToFile(buffer, tempVideoPath);

      // Calculate evenly-spaced timestamps within the range
      const duration = endSec - startSec;
      if (duration <= 0) {
        return [];
      }

      const clampedCount = Math.min(frameCount, VIDEO_CONFIG.MAX_FRAMES);
      const timestamps: number[] = [];
      if (clampedCount === 1) {
        timestamps.push(startSec);
      } else {
        const step = duration / (clampedCount - 1);
        for (let i = 0; i < clampedCount; i++) {
          timestamps.push(startSec + step * i);
        }
      }

      // Extract frames
      const framesDir = join(tempDir, "frames");
      await fs.mkdir(framesDir, { recursive: true });
      await this.runFfmpegFrameExtraction(tempVideoPath, framesDir, timestamps);

      // Read and resize frames
      const keyframes: Buffer[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const framePath = join(
          framesDir,
          `frame_${String(i + 1).padStart(4, "0")}.jpg`,
        );
        try {
          await fs.access(framePath);
          const rawFrame = await fs.readFile(framePath);
          const resized = await sharp(rawFrame)
            .resize(
              VIDEO_CONFIG.FRAME_MAX_DIMENSION,
              VIDEO_CONFIG.FRAME_MAX_DIMENSION,
              {
                fit: "inside",
                withoutEnlargement: true,
              },
            )
            .jpeg({ quality: VIDEO_CONFIG.FRAME_JPEG_QUALITY })
            .toBuffer();
          keyframes.push(resized);
        } catch {
          // Skip individual frame failures
        }
      }

      return keyframes;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
        /* cleanup - ignore temp dir removal errors */
      });
    }
  }

  /**
   * Guess file extension from filename, with fallback to .mp4.
   */
  private guessExtensionFromName(filename: string): string {
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex >= 0) {
      return filename.substring(dotIndex).toLowerCase();
    }
    return ".mp4";
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Video processor instance.
 * Use this for standard video processing operations.
 *
 * @example
 * ```typescript
 * import { videoProcessor } from "./VideoProcessor.js";
 *
 * const result = await videoProcessor.processFile(fileInfo);
 * ```
 */
export const videoProcessor = new VideoProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a video file.
 * Matches by MIME type or file extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a supported video file
 *
 * @example
 * ```typescript
 * if (isVideoFile("video/mp4", "recording.mp4")) {
 *   const result = await processVideo(fileInfo);
 * }
 *
 * if (isVideoFile("", "clip.mkv")) {
 *   // Also matches by extension
 * }
 * ```
 */
export function isVideoFile(mimetype: string, filename: string): boolean {
  return videoProcessor.isFileSupported(mimetype, filename);
}

/**
 * Process a single video file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with extracted video data or error
 *
 * @example
 * ```typescript
 * import { processVideo } from "./VideoProcessor.js";
 *
 * const result = await processVideo({
 *   id: "vid-123",
 *   name: "demo.mp4",
 *   mimetype: "video/mp4",
 *   size: 15_000_000,
 *   buffer: videoBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(`Duration: ${result.data.metadata.durationFormatted}`);
 *   console.log(`Extracted ${result.data.frameCount} keyframes`);
 *   console.log(`Text content:\n${result.data.textContent}`);
 *
 *   if (result.data.subtitleText) {
 *     console.log(`Subtitles:\n${result.data.subtitleText}`);
 *   }
 * } else {
 *   console.error(`Processing failed: ${result.error?.userMessage}`);
 * }
 * ```
 */
export async function processVideo(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedVideo>> {
  return videoProcessor.processFile(fileInfo, options);
}
