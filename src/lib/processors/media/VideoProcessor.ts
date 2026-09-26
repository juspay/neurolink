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
 * Uses mediabunny (pure TypeScript) for metadata extraction, with fluent-ffmpeg
 * as a fallback for unsupported formats. Requires ffmpeg for keyframe/subtitle
 * extraction (via ffmpeg-static or system PATH).
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
import { createWriteStream, existsSync, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import {
  formatKeyframeTimestamp,
  formatMediaDuration,
} from "../../utils/mediaDuration.js";
import type {
  FfprobeData,
  FfprobeStream,
  FileInfo,
  ProcessedVideo,
  ProcessorFileProcessingResult,
  ProcessOptions,
  VideoKeyframe,
  VideoProcessorOptions,
} from "../../types/index.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import {
  extensionsForModality,
  mimeTypesForModality,
} from "../config/fileTypeRegistry.js";
import { FileErrorCode } from "../errors/index.js";
import { tracers, ATTR, withSpan } from "../../telemetry/index.js";
import { logger } from "../../utils/logger.js";
import { tryImport } from "../../utils/tryImport.js";
import { withTimeout } from "../../utils/errorHandling.js";
import { runFfmpeg } from "../../adapters/video/ffmpegAdapter.js";

/**
 * Narrow a loaded `fluent-ffmpeg` export to the shape this file actually uses:
 * a callable carrying the `ffprobe` and `setFfmpegPath` statics.
 *
 * `tryImport` proves only that the package RESOLVES. Callers invoke the export
 * and reach straight for its statics, so a package whose shape changed (ESM
 * rewrite, major bump, a shim in node_modules) would otherwise surface as
 * "Cannot read properties of undefined (reading 'ffprobe')" from inside
 * probeVideo — blaming the call site instead of the package that is wrong.
 */
export function assertFluentFfmpegShape(
  mod: unknown,
): asserts mod is typeof import("fluent-ffmpeg") {
  // Not `Partial<typeof import("fluent-ffmpeg")>`: Partial maps over properties
  // and drops the call signature, so `typeof x === "function"` would narrow the
  // result to `never`. Probe the statics structurally instead.
  const statics = mod as { ffprobe?: unknown; setFfmpegPath?: unknown };
  if (
    typeof mod !== "function" ||
    typeof statics.ffprobe !== "function" ||
    typeof statics.setFfmpegPath !== "function"
  ) {
    throw new Error(
      `The installed "fluent-ffmpeg" package does not export a callable with ` +
        `ffprobe and setFfmpegPath statics (got ${typeof mod}). ` +
        `Reinstall a compatible version:\n  pnpm add fluent-ffmpeg`,
    );
  }
}

// fluent-ffmpeg's default export is callable + has static methods — avoid caching
// the module type (it confuses TS); Node's module cache handles dedup.
async function loadFluentFfmpeg() {
  // fluent-ffmpeg is CJS (`export =`), so `typeof import(...)` describes the
  // callable itself and carries no `default`. Under Node ESM the namespace
  // still wraps it, so ask for that shape explicitly.
  const mod = await tryImport<{ default: typeof import("fluent-ffmpeg") }>(
    "fluent-ffmpeg",
    "Video processing",
  );
  const ffmpeg = mod.default;
  assertFluentFfmpegShape(ffmpeg);
  return ffmpeg;
}

let _mediabunny: typeof import("mediabunny") | null = null;
async function loadMediaBunny() {
  if (_mediabunny) {
    return _mediabunny;
  }
  _mediabunny = await tryImport<typeof import("mediabunny")>(
    "mediabunny",
    "Video processing",
  );
  return _mediabunny;
}

// Keyframe resize (both extraction paths) previously swallowed a missing
// `sharp` with a fully silent per-frame catch — every frame failed the same
// way and nothing ever said why. Route the import through this loader so the
// cause is logged once (not once per frame) the first time it fails; the
// per-frame catch sites still skip individually, matching prior behavior.
let sharpLoadWarned = false;
async function loadSharp() {
  try {
    // `typeof import("sharp")` is the MODULE namespace, and sharp 0.35 puts
    // the callable factory on its `default` export. Typing the import as
    // `{ default: typeof import("sharp") }` wrapped that namespace a second
    // time, so `mod.default` came back as a namespace rather than a factory
    // and every call site failed with "no call signatures".
    //
    // imageFormatSupport.ts already reads `sharpModule.default(...)` for the
    // same reason; this loader is now the one place that normalizes it, so
    // callers keep calling the returned value directly.
    const mod = await tryImport<typeof import("sharp")>(
      "sharp",
      "Video keyframe resizing",
    );
    return mod.default;
  } catch (error) {
    if (!sharpLoadWarned) {
      sharpLoadWarned = true;
      logger.warn(
        "[VideoProcessor] sharp is required to resize extracted keyframes but failed to load; keyframe extraction will return no frames",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
    throw error;
  }
}

// =============================================================================
// FFMPEG PATH INITIALIZATION
// =============================================================================

/**
 * Whether ffmpeg/ffprobe paths have been initialized.
 * We only attempt path resolution once to avoid repeated dynamic import overhead.
 */
let ffmpegPathInitialized = false;

/**
 * Initialize ffmpeg binary paths.
 * Tries ffmpeg-static first, falls back to system binary in PATH.
 *
 * Note: ffprobe-static has been removed. Metadata probing now uses mediabunny
 * (pure TypeScript) as the primary method, with ffprobe as a fallback only when
 * mediabunny cannot handle the format (e.g., AVI, FLV).
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
      const ff = await loadFluentFfmpeg();
      ff.setFfmpegPath(ffmpegPath);
    }
  } catch {
    // Use system ffmpeg (already in PATH)
  }
}

// =============================================================================
// TYPES
// =============================================================================

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
  /**
   * Timeout for demuxing the audio track out of a video (#433).
   *
   * Generous next to frame extraction: this reads the whole file rather than
   * seeking to a handful of offsets, and a meeting recording is long.
   */
  AUDIO_EXTRACT_TIMEOUT_MS: 180_000,
  /** Timeout for one Whisper transcription request in milliseconds */
  TRANSCRIPTION_TIMEOUT_MS: 120_000,
  /**
   * Whisper's upload ceiling in MB. The extracted track is mono 16 kHz MP3,
   * so this is roughly six hours of speech — a clip that breaches it is
   * unusual enough to be worth saying so rather than silently truncating.
   */
  WHISPER_MAX_SIZE_MB: 25,
} as const;

/**
 * Supported video MIME types — derived from the canonical registry so this
 * processor and the detector in front of it cannot disagree about what "video"
 * means. Before the registry they did: .m2ts, .mts, .vob, .3g2 and .ogv were
 * declared supported here and detected as "unknown", and .mpg/.mpeg were
 * detected as CSV.
 */
const SUPPORTED_VIDEO_MIME_TYPES: readonly string[] =
  mimeTypesForModality("video");

/** Supported video file extensions — derived from the canonical registry. */
const SUPPORTED_VIDEO_EXTENSIONS: readonly string[] =
  extensionsForModality("video");

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
      keyframeTimestampsSec: [],
      hasTranscript: false,
      metadata: {
        duration: 0,
        durationFormatted: formatMediaDuration(0),
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
    // #478: widened with the keyframe knobs so `--video-frames`/`-quality`/
    // `-format` can reach the encoder instead of being silently discarded.
    options?: ProcessOptions & VideoProcessorOptions,
  ): Promise<ProcessorFileProcessingResult<ProcessedVideo>> {
    const filename = this.getFilename(fileInfo);
    const sizeBytes = fileInfo.size || fileInfo.buffer?.length || 0;

    return withSpan(
      {
        name: "neurolink.file.video.process",
        tracer: tracers.file,
        attributes: {
          [ATTR.FILE_NAME]: filename,
          [ATTR.FILE_MIMETYPE]: fileInfo.mimetype || "video/mp4",
          [ATTR.FILE_SIZE_BYTES]: sizeBytes,
        },
      },
      async (span) => {
        logger.info(
          `[NEUROLINK] Video processing started: ${filename} (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB, ${fileInfo.mimetype || "video/mp4"})`,
        );

        // Ensure ffmpeg paths are initialized before any processing
        await initFfmpegPaths();

        // Temp directory for this processing run
        const tempDir = join(tmpdir(), `neurolink-video-${randomUUID()}`);
        let tempCreated = false;

        try {
          // Step 1: Validate file type and size
          const validationResult = this.validateFileWithResult(fileInfo);
          if (!validationResult.success) {
            const validationErrMsg =
              validationResult.error?.message || "Validation failed";
            span.setAttribute(ATTR.FILE_SUCCESS, false);
            span.setAttribute(ATTR.FILE_ERROR, validationErrMsg);
            logger.warn(
              `[NEUROLINK] Video skipped/failed: ${filename} — reason: ${validationErrMsg}`,
            );
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
              const downloadErrMsg =
                downloadResult.error?.message || "Download failed";
              span.setAttribute(ATTR.FILE_SUCCESS, false);
              span.setAttribute(ATTR.FILE_ERROR, downloadErrMsg);
              logger.warn(
                `[NEUROLINK] Video skipped/failed: ${filename} — reason: ${downloadErrMsg}`,
              );
              return { success: false, error: downloadResult.error };
            }
            if (!downloadResult.data) {
              const errMsg = "Download succeeded but returned no data";
              span.setAttribute(ATTR.FILE_SUCCESS, false);
              span.setAttribute(ATTR.FILE_ERROR, errMsg);
              logger.warn(
                `[NEUROLINK] Video skipped/failed: ${filename} — reason: ${errMsg}`,
              );
              return {
                success: false,
                error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
                  reason: errMsg,
                }),
              };
            }
            buffer = downloadResult.data;

            // Validate actual downloaded size
            if (!this.validateFileSize(buffer.length)) {
              const errMsg = `File too large: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB (max: ${this.config.maxSizeMB} MB)`;
              span.setAttribute(ATTR.FILE_SUCCESS, false);
              span.setAttribute(ATTR.FILE_ERROR, errMsg);
              logger.warn(
                `[NEUROLINK] Video skipped/failed: ${filename} — reason: ${errMsg}`,
              );
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
            const errMsg = "No buffer or URL provided for file";
            span.setAttribute(ATTR.FILE_SUCCESS, false);
            span.setAttribute(ATTR.FILE_ERROR, errMsg);
            logger.warn(
              `[NEUROLINK] Video skipped/failed: ${filename} — reason: ${errMsg}`,
            );
            return {
              success: false,
              error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
                reason: errMsg,
              }),
            };
          }

          // Step 3: Write buffer to temp file (ffmpeg needs a file path)
          await fs.mkdir(tempDir, { recursive: true });
          tempCreated = true;

          const extension = this.getExtensionFromFileInfo(fileInfo);
          const tempVideoPath = join(tempDir, `input${extension}`);
          await this.writeBufferToFile(buffer, tempVideoPath);

          // Step 4: Extract metadata — try mediabunny first (pure TS, no binary),
          // fall back to ffprobe for formats mediabunny doesn't support (AVI, FLV, WMV).
          let metadata: ProcessedVideo["metadata"] | undefined;
          const mediabunnyResult =
            await this.probeVideoWithMediabunny(tempVideoPath);
          if (mediabunnyResult.success && mediabunnyResult.data) {
            metadata = { ...mediabunnyResult.data, fileSize: buffer.length };
          } else {
            // Fall back to ffprobe (requires system ffprobe to be available)
            const probeResult = await this.probeVideo(tempVideoPath);
            if (probeResult.success && probeResult.data) {
              metadata = this.buildMetadata(probeResult.data, buffer.length);
            }
          }

          if (!metadata) {
            metadata = {
              duration: 0,
              durationFormatted: "unknown",
              width: 0,
              height: 0,
              codec: "unknown",
              fps: 0,
              bitrate: 0,
              subtitleTracks: 0,
              fileSize: buffer.length,
            };
          }

          // Record video-specific metadata on span
          span.setAttribute(ATTR.VIDEO_DURATION_SEC, metadata.duration);
          span.setAttribute(ATTR.VIDEO_WIDTH, metadata.width);
          span.setAttribute(ATTR.VIDEO_HEIGHT, metadata.height);
          span.setAttribute(ATTR.VIDEO_CODEC, metadata.codec);
          span.setAttribute(
            ATTR.VIDEO_HAS_SUBTITLES,
            metadata.subtitleTracks > 0,
          );

          // Step 5: Extract keyframes
          let keyframes: VideoKeyframe[] = [];
          try {
            keyframes = await this.extractKeyframes(
              tempVideoPath,
              tempDir,
              metadata.duration,
              options,
            );
          } catch {
            // Non-fatal: continue without keyframes if extraction fails
            // (e.g., audio-only file in a video container)
            logger.warn(
              `[NEUROLINK] Video keyframe extraction failed for ${filename}, continuing without keyframes`,
            );
          }

          span.setAttribute(ATTR.VIDEO_KEYFRAMES_EXTRACTED, keyframes.length);

          // Debug-only: the real per-frame sample times, so a caller running
          // with --debug can see what the model was actually told without
          // re-deriving it from the request body.
          if (logger.shouldLog("debug") && keyframes.length > 0) {
            logger.debug(
              `[NEUROLINK] Video keyframe timestamps: ${keyframes
                .map((frame) => frame.timestampSec.toFixed(3))
                .join(",")}`,
            );
          }

          // Step 6: Extract subtitles
          let subtitleText: string | undefined;
          if (metadata.subtitleTracks > 0) {
            try {
              subtitleText = await this.extractSubtitles(
                tempVideoPath,
                tempDir,
              );
            } catch {
              // Non-fatal: continue without subtitles if extraction fails
            }
          }

          // Step 7: Transcribe spoken audio, if asked
          const transcription = await this.extractAndTranscribeAudio(
            tempVideoPath,
            tempDir,
            metadata,
            filename,
            options,
          );

          // Step 8: Build textContent for LLM
          const textContent = this.buildTextContent(
            metadata,
            keyframes.map((frame) => frame.timestampSec),
            subtitleText,
            this.getFilename(fileInfo),
            transcription.transcript,
          );

          span.setAttribute(ATTR.VIDEO_TEXT_CONTENT_LENGTH, textContent.length);
          span.setAttribute(ATTR.FILE_OUTPUT_LENGTH, textContent.length);
          span.setAttribute(ATTR.FILE_SUCCESS, true);

          logger.info(
            `[NEUROLINK] Video processed: ${filename} → ${textContent.length} bytes text + ${keyframes.length} keyframes ` +
              `(${metadata.durationFormatted}, ${metadata.width}x${metadata.height}, ${metadata.codec})`,
          );

          // Step 9: Return structured result
          return {
            success: true,
            data: {
              buffer,
              mimetype: fileInfo.mimetype || "video/mp4",
              size: fileInfo.size,
              filename: this.getFilename(fileInfo),
              textContent,
              keyframes: keyframes.map((frame) => frame.buffer),
              keyframeTimestampsSec: keyframes.map(
                (frame) => frame.timestampSec,
              ),
              metadata,
              subtitleText,
              transcript: transcription.transcript,
              hasTranscript: !!transcription.transcript,
              ...(transcription.skippedReason
                ? { transcriptionSkippedReason: transcription.skippedReason }
                : {}),
              hasKeyframes: keyframes.length > 0,
              frameCount: keyframes.length,
            },
          };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          span.setAttribute(ATTR.FILE_SUCCESS, false);
          span.setAttribute(ATTR.FILE_ERROR, errMsg);
          logger.error(
            `[NEUROLINK] Video processing failed: ${filename} — ${errMsg}`,
          );
          return {
            success: false,
            error: this.createError(
              FileErrorCode.PROCESSING_FAILED,
              {
                fileType: "video",
                error: errMsg,
              },
              error instanceof Error ? error : undefined,
            ),
          };
        } finally {
          // Step 10: Clean up temp files
          if (tempCreated) {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
              // Ignore cleanup errors - temp files will be cleaned by OS eventually
            });
          }
        }
      },
    );
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
  private async probeVideo(
    filePath: string,
  ): Promise<{ success: boolean; data?: FfprobeData; error?: string }> {
    const ffmpeg = await loadFluentFfmpeg();
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: `ffprobe timed out after ${VIDEO_CONFIG.FFPROBE_TIMEOUT_MS}ms`,
        });
      }, VIDEO_CONFIG.FFPROBE_TIMEOUT_MS);

      ffmpeg.ffprobe(filePath, (err, data) => {
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
   * Probe a video file using mediabunny (pure TypeScript, no native binary).
   * Falls back to ffprobe if mediabunny fails or doesn't support the format.
   */
  private async probeVideoWithMediabunny(filePath: string): Promise<{
    success: boolean;
    data?: ProcessedVideo["metadata"];
    error?: string;
  }> {
    const mb = await loadMediaBunny();
    let input: InstanceType<typeof mb.Input> | undefined;
    try {
      input = new mb.Input({
        source: new mb.FilePathSource(filePath),
        formats: [...mb.ALL_FORMATS],
      });

      const duration = await input.computeDuration();
      const videoTrack = await input.getPrimaryVideoTrack();
      const audioTrack = await input.getPrimaryAudioTrack();
      const allTracks = await input.getTracks();
      const subtitleTracks = allTracks.filter(
        (t) => !t.isVideoTrack() && !t.isAudioTrack(),
      );

      // Get FPS from video track packet stats (sample a small number of packets)
      let fps = 0;
      if (videoTrack) {
        try {
          const stats = await videoTrack.computePacketStats(120);
          fps = Math.round(stats.averagePacketRate * 100) / 100;
        } catch {
          // FPS unavailable — non-fatal
        }
      }

      return {
        success: true,
        data: {
          duration: duration ?? 0,
          durationFormatted: this.formatDuration(duration ?? 0),
          width: videoTrack?.displayWidth ?? 0,
          height: videoTrack?.displayHeight ?? 0,
          codec: videoTrack?.codec ?? "unknown",
          fps,
          bitrate: 0,
          audioCodec: audioTrack?.codec ?? undefined,
          audioChannels: audioTrack?.numberOfChannels,
          audioSampleRate: audioTrack?.sampleRate,
          subtitleTracks: subtitleTracks.length,
          fileSize: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `mediabunny failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    } finally {
      input?.dispose();
    }
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
   * Clamp a caller-supplied frame quality into sharp's valid 1-100 range,
   * falling back to the default when absent or non-numeric (#478).
   */
  private static resolveFrameQuality(quality?: number): number {
    if (typeof quality !== "number" || !Number.isFinite(quality)) {
      return VIDEO_CONFIG.FRAME_JPEG_QUALITY;
    }
    return Math.min(100, Math.max(1, Math.round(quality)));
  }

  /**
   * Extract the clip's audio track and transcribe the speech in it (#433).
   *
   * ## Why this exists at all, now that Gemini hears video directly
   *
   * It does not help Gemini — a native provider receives the clip and its
   * audio together. It is for everyone else. A provider on the frame path
   * gets stills and nothing else, so a recorded standup, a support call or a
   * narrated demo arrives with its entire spoken content missing, and
   * "summarise this meeting" is answered from four screenshots.
   *
   * ## Why it is not a stub
   *
   * The issue asked for one, on the grounds that no transcription backend
   * existed yet. One does: `AudioProcessor` has shipped Whisper transcription
   * for standalone audio files for some time. A method that logged "not yet
   * implemented" and returned undefined would be dead code sitting next to a
   * working implementation of the same thing, and `--transcribe-audio` would
   * still do nothing.
   *
   * The Whisper call is reproduced here rather than shared with
   * `AudioProcessor`: extracting it into a common module is the better
   * long-term shape, but that file is being edited concurrently, and a
   * merge conflict in the audio pipeline is a worse outcome than fifty
   * duplicated lines. The duplication is worth removing once both land.
   *
   * ## Failure behaviour
   *
   * Best-effort throughout, and never throws: a clip with no audio track, a
   * machine without ffmpeg, a missing key, an oversized track or a failed
   * request all return a *reason* and leave the rest of the pipeline intact.
   * Each reason is distinct, because from the outside every one of them
   * looks the same — no transcript — while the remedies differ completely.
   *
   * @param videoPath - Temp path to the video, already written by the caller
   * @param tempDir - Caller-owned temp directory; removed in its `finally`
   * @param metadata - Probed metadata, consulted for an audio track
   * @param filename - Display name, for logs
   * @param options - Caller settings; transcription runs only when asked
   */
  private async extractAndTranscribeAudio(
    videoPath: string,
    tempDir: string,
    metadata: ProcessedVideo["metadata"],
    filename: string,
    options?: VideoProcessorOptions,
  ): Promise<{ transcript?: string; skippedReason?: string }> {
    if (!options?.transcribeAudio) {
      // Not a skip worth reporting: nobody asked. Reporting it would put a
      // "no transcript because..." line in every video result.
      return {};
    }

    const skipped = (reason: string): { skippedReason: string } => {
      logger.warn(
        `[VideoProcessor] No transcript for ${filename}: ${reason}. ` +
          `The model will receive the keyframes and metadata only.`,
      );
      return { skippedReason: reason };
    };

    // Probing reports no audio codec both for a genuinely silent clip and
    // for one nothing could open. Either way there is nothing to send, and
    // the ffmpeg pass below would only fail more slowly.
    if (!metadata.audioCodec) {
      return skipped("the video has no audio track");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return skipped(
        "OPENAI_API_KEY is not set, and Whisper is the only transcription backend wired up",
      );
    }

    const audioPath = join(tempDir, "audio.mp3");
    try {
      await runFfmpeg(
        [
          "-y",
          "-v",
          "error",
          "-i",
          videoPath,
          // Drop the video stream outright. Without -vn ffmpeg tries to carry
          // it into an MP3 container as cover art and fails on most inputs.
          "-vn",
          // Mono at 16 kHz is what Whisper resamples to anyway, and it keeps
          // an hour-long recording comfortably under the upload ceiling.
          "-ac",
          "1",
          "-ar",
          "16000",
          "-c:a",
          "libmp3lame",
          "-q:a",
          "4",
          audioPath,
        ],
        { timeoutMs: VIDEO_CONFIG.AUDIO_EXTRACT_TIMEOUT_MS },
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message.split("\n")[0] : String(error);
      return skipped(`the audio track could not be extracted — ${detail}`);
    }

    let audioBuffer: Buffer;
    try {
      audioBuffer = await fs.readFile(audioPath);
    } catch {
      return skipped("ffmpeg reported success but wrote no audio file");
    }
    if (audioBuffer.length === 0) {
      return skipped("the extracted audio track was empty");
    }

    const sizeMB = audioBuffer.length / (1024 * 1024);
    if (sizeMB > VIDEO_CONFIG.WHISPER_MAX_SIZE_MB) {
      return skipped(
        `the extracted audio is ${sizeMB.toFixed(1)}MB, over Whisper's ` +
          `${VIDEO_CONFIG.WHISPER_MAX_SIZE_MB}MB limit — split the recording`,
      );
    }

    const baseUrl = (
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" }),
      "audio.mp3",
    );
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");

    // `withTimeout` only races a promise against a timer — it cannot cancel
    // the request. Without the abort, a timed-out upload keeps its socket and
    // its in-flight body alive after the caller has already moved on.
    const abort = new AbortController();
    const timer = setTimeout(
      () => abort.abort(),
      VIDEO_CONFIG.TRANSCRIPTION_TIMEOUT_MS,
    );
    try {
      const response = await withTimeout(
        fetch(`${baseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: abort.signal,
        }),
        VIDEO_CONFIG.TRANSCRIPTION_TIMEOUT_MS,
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        return skipped(
          `the transcription request failed — HTTP ${response.status}` +
            `${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }

      const payload: unknown = await response.json();
      const text =
        typeof payload === "object" &&
        payload !== null &&
        typeof (payload as { text?: unknown }).text === "string"
          ? (payload as { text: string }).text.trim()
          : "";

      if (text.length === 0) {
        // A successful call returning nothing is a real outcome — silence,
        // music, no speech — and not the same as a failure.
        return skipped("Whisper returned an empty transcript for this audio");
      }

      logger.debug(
        `[VideoProcessor] Transcribed ${filename} via openai-whisper (${text.length} chars)`,
      );
      return { transcript: text };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return skipped(`the transcription request failed — ${detail}`);
    } finally {
      clearTimeout(timer);
    }
  }

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
   * A caller-supplied `options.frames` overrides the tier schedule entirely:
   * that many frames are spread evenly across the clip, still capped at
   * MAX_FRAMES. `options.quality` and `options.format` reach the encoder (#478).
   *
   * @param videoPath - Path to the video file
   * @param tempDir - Temp directory for frame output
   * @param durationSec - Video duration in seconds
   * @param options - Caller frame budget / encoder settings
   * @returns Each kept frame with the second it was sampled at, ascending
   */
  private async extractKeyframes(
    videoPath: string,
    tempDir: string,
    durationSec: number,
    options?: VideoProcessorOptions,
  ): Promise<VideoKeyframe[]> {
    if (durationSec <= 0) {
      return [];
    }

    // #478: honor the caller's frame budget, still bounded by MAX_FRAMES so a
    // CLI flag can lower the cost but never raise it past the processor's own
    // ceiling. A non-positive/non-finite request falls back to the default.
    const requestedFrames = options?.frames;
    const hasExplicitBudget =
      typeof requestedFrames === "number" &&
      Number.isFinite(requestedFrames) &&
      requestedFrames > 0;
    const frameBudget = hasExplicitBudget
      ? Math.min(Math.floor(requestedFrames), VIDEO_CONFIG.MAX_FRAMES)
      : VIDEO_CONFIG.MAX_FRAMES;

    // Determine extraction interval based on duration. When the caller asked
    // for a specific frame count, spread that many evenly across the whole
    // video instead of using the duration tier — otherwise a short interval
    // would hit the budget early and only cover the opening seconds.
    //
    // Keyed on whether a budget was REQUESTED, not on whether it happens to be
    // below MAX_FRAMES: asking for exactly MAX_FRAMES is still an explicit
    // request and must produce that many frames, not silently fall back to the
    // tier schedule (which yields far fewer on a short clip).
    const intervalSec = hasExplicitBudget
      ? Math.max(durationSec / frameBudget, Number.EPSILON)
      : this.getFrameInterval(durationSec);

    // Calculate timestamps to extract
    const timestamps: number[] = [];
    for (
      let t = 0;
      t < durationSec && timestamps.length < frameBudget;
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

    // The requested `timestamps` are an idealized, evenly-spaced schedule.
    // ffmpeg's `-vf select` only guarantees a MINIMUM gap since the last
    // frame it actually selected — on a source whose real frame spacing
    // exceeds that gap, the selected frames land later than the schedule
    // and the gap compounds across every subsequent frame. `showinfo`
    // reports each selected frame's true `pts_time`, which is what gets
    // paired with the encoded file below instead of the idealized value.
    const realTimestamps = await this.runFfmpegFrameExtraction(
      videoPath,
      framesDir,
      timestamps,
      intervalSec,
    );

    // Read extracted frames and resize with sharp
    const keyframes: VideoKeyframe[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const framePath = join(
        framesDir,
        `frame_${String(i + 1).padStart(4, "0")}.jpg`,
      );
      try {
        await fs.access(framePath);
        const rawFrame = await fs.readFile(framePath);

        // Resize to fit within max dimension while preserving aspect ratio
        const sharp = await loadSharp();
        const pipeline = sharp(rawFrame).resize(
          VIDEO_CONFIG.FRAME_MAX_DIMENSION,
          VIDEO_CONFIG.FRAME_MAX_DIMENSION,
          {
            fit: "inside",
            withoutEnlargement: true,
          },
        );

        // #478: `--video-quality` / `--video-format` were accepted by the CLI
        // and then dropped on the floor; both now reach the encoder.
        const quality = VideoProcessor.resolveFrameQuality(options?.quality);
        const resized = await (
          options?.format === "png"
            ? pipeline.png({ quality })
            : pipeline.jpeg({ quality })
        ).toBuffer();

        // Paired as the frame is kept, not derived afterwards from the
        // interval: the catch below drops a frame whose encode failed, and a
        // reconstructed schedule would then mislabel every frame after it.
        // Prefer the real PTS ffmpeg reported for this output file; only
        // fall back to the idealized schedule value if `showinfo` didn't
        // report one (e.g. an older/unexpected ffmpeg build).
        const timestampSec = realTimestamps[i] ?? timestamps[i];
        keyframes.push({ buffer: resized, timestampSec });
      } catch {
        // Skip individual frame on resize/encode failure
      }
    }

    return keyframes;
  }

  /**
   * Run ffmpeg to extract frames at specified timestamps.
   *
   * Uses the `-vf select` filter to pick frames at least `intervalSec` apart,
   * which is more efficient than seeking for each frame individually. This is
   * a minimum-gap filter, not a seek to an exact time: on a source whose real
   * frame spacing exceeds the requested interval, the frame actually selected
   * can land well after the ideal schedule. A `showinfo` stage between
   * `select` and `scale` reports each selected frame's true `pts_time` to
   * stderr so the caller can label frames with when they were really
   * sampled, not the idealized request.
   *
   * @param videoPath - Path to the video file
   * @param outputDir - Directory to write frame files
   * @param timestamps - Array of timestamps in seconds
   * @param intervalSec - Minimum gap enforced between selected frames
   * @returns The real `pts_time` (seconds) ffmpeg reported for each selected
   *   frame, in output-file order; may be shorter than `timestamps` if fewer
   *   real frames were available to select
   */
  private async runFfmpegFrameExtraction(
    videoPath: string,
    outputDir: string,
    timestamps: number[],
    intervalSec: number,
  ): Promise<number[]> {
    const ff = await loadFluentFfmpeg();
    return new Promise((resolve, reject) => {
      // Improved select expression to pick exactly one frame per interval
      // instead of multiple frames within a 0.5s window.
      const selectExpr = `isnan(prev_selected_t)+gte(t-prev_selected_t,${intervalSec}-0.001)`;
      const PTS_TIME_RE = /pts_time:\s*(-?\d+(?:\.\d+)?)/;
      const realTimestamps: number[] = [];

      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `ffmpeg frame extraction timed out after ${VIDEO_CONFIG.FFMPEG_TIMEOUT_MS}ms`,
          ),
        );
      }, VIDEO_CONFIG.FFMPEG_TIMEOUT_MS);

      ff(videoPath)
        .outputOptions([
          "-vf",
          `select='${selectExpr}',showinfo,scale='min(${VIDEO_CONFIG.FRAME_MAX_DIMENSION}\\,iw):-2'`,
          "-vsync",
          "vfr",
          "-q:v",
          "3",
          "-frames:v",
          String(timestamps.length),
        ])
        .output(join(outputDir, "frame_%04d.jpg"))
        .on("stderr", (line: string) => {
          // showinfo writes one log line per selected frame, in the same
          // ascending order ffmpeg encodes frame_0001, frame_0002, ...
          const match = PTS_TIME_RE.exec(line);
          if (match) {
            realTimestamps.push(Number.parseFloat(match[1]));
          }
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          resolve(realTimestamps);
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

    const ffSub = await loadFluentFfmpeg();
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `ffmpeg subtitle extraction timed out after ${VIDEO_CONFIG.FFMPEG_TIMEOUT_MS}ms`,
          ),
        );
      }, VIDEO_CONFIG.FFMPEG_TIMEOUT_MS);

      ffSub(videoPath)
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
   * @param keyframeTimestampsSec - The real second each kept keyframe was sampled at
   * @param subtitleText - Extracted subtitle text (if any)
   * @param filename - Original filename
   * @param transcript - Machine transcription of the spoken audio (if requested and available)
   * @returns Formatted text content for the LLM
   */
  private buildTextContent(
    metadata: ProcessedVideo["metadata"],
    keyframeTimestampsSec: number[],
    subtitleText: string | undefined,
    filename: string,
    transcript: string | undefined,
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
    if (keyframeTimestampsSec.length > 0) {
      // The real sample times, not the duration tier's nominal interval. Those
      // two disagree whenever the caller passed `videoOptions.frames`, because
      // an explicit budget spreads frames evenly across the clip instead of
      // following the tier — so a 3s clip asked for 16 frames used to be
      // described as "every ~1s" while the frames were 0.19s apart. Listing
      // what was actually sampled cannot drift from what was sent, and it is
      // also what lets the model answer a question about a specific moment.
      lines.push(`## Keyframes (${keyframeTimestampsSec.length} extracted)`);
      lines.push(
        "The images attached below are keyframes from this video, in order. " +
          "Each was sampled at the timestamp listed here:",
      );
      for (const [index, timestampSec] of keyframeTimestampsSec.entries()) {
        lines.push(
          `- Frame ${index + 1}: ${formatKeyframeTimestamp(timestampSec)}`,
        );
      }
    } else {
      lines.push("## Keyframes");
      lines.push(
        "No keyframes could be extracted from this video (it may be audio-only or use an unsupported codec).",
      );
    }

    if (transcript) {
      lines.push("");
      // Labelled as transcribed speech, not as captions: the two can both be
      // present and disagree, and a model told which is which can say so
      // rather than averaging them into one confident answer.
      lines.push("## Spoken Audio (transcribed)");
      lines.push(
        "The following is a machine transcription of the speech in this video:",
      );
      const maxTranscriptChars = 20_000;
      if (transcript.length > maxTranscriptChars) {
        lines.push(
          transcript.substring(0, maxTranscriptChars) +
            `\n... [truncated, ${transcript.length - maxTranscriptChars} more characters]`,
        );
      } else {
        lines.push(transcript);
      }
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
   * Delegates to the shared formatter so audio and video agree — see
   * `formatMediaDuration`. Rounding replaces the previous truncation, so a
   * 2.6s clip now reads "3s" rather than "2s" and matches what the audio
   * side reports for the same stream.
   *
   * @param seconds - Duration in seconds
   * @returns Formatted string (e.g., "1h 23m 45s")
   */
  private formatDuration(seconds: number): string {
    return formatMediaDuration(seconds);
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
      let interval = duration;

      if (clampedCount === 1) {
        timestamps.push(startSec);
      } else {
        interval = duration / (clampedCount - 1);
        for (let i = 0; i < clampedCount; i++) {
          timestamps.push(startSec + interval * i);
        }
      }

      // Extract frames
      const framesDir = join(tempDir, "frames");
      await fs.mkdir(framesDir, { recursive: true });
      await this.runFfmpegFrameExtraction(
        tempVideoPath,
        framesDir,
        timestamps,
        interval,
      );

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
          const sharp = await loadSharp();
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
): Promise<ProcessorFileProcessingResult<ProcessedVideo>> {
  return videoProcessor.processFile(fileInfo, options);
}
