/**
 * Audio File Processor
 *
 * Handles downloading, validating, and processing audio files to extract metadata
 * and build text content suitable for LLM consumption. Audio files cannot be sent
 * raw to most LLMs, so this processor extracts structured metadata (duration, codec,
 * bitrate, tags) and formats it as text.
 *
 * Uses the `music-metadata` library (pure JavaScript, no native dependencies) for
 * metadata extraction. Supports all major audio formats: MP3, WAV, OGG, FLAC, M4A,
 * AAC, WMA, WebM, AIFF, AMR, APE, WavPack, and more.
 *
 * Key features:
 * - Metadata extraction: duration, codec, bitrate, sample rate, channels
 * - Tag extraction: title, artist, album, year, genre, track number, composer
 * - Embedded cover art extraction
 * - Graceful degradation for corrupt or partially readable files
 * - LLM-friendly text content generation
 *
 * @module processors/media/AudioProcessor
 *
 * @example
 * ```typescript
 * import { audioProcessor, processAudio, isAudioFile } from "./AudioProcessor.js";
 *
 * // Check if a file is an audio file
 * if (isAudioFile(fileInfo.mimetype, fileInfo.name)) {
 *   const result = await processAudio(fileInfo);
 *
 *   if (result.success) {
 *     console.log(`Duration: ${result.data.metadata.durationFormatted}`);
 *     console.log(`Codec: ${result.data.metadata.codec}`);
 *     console.log(`Artist: ${result.data.tags.artist}`);
 *     console.log(`Text for LLM: ${result.data.textContent}`);
 *   }
 * }
 * ```
 */

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  ProcessedAudio,
  ProcessorFileProcessingResult,
  ProcessOptions,
} from "../../types/index.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import {
  extensionsForModality,
  mimeTypesForModality,
} from "../config/fileTypeRegistry.js";
import { FileErrorCode } from "../errors/index.js";
import { withTimeout } from "../../utils/timeout.js";
import { formatMediaDuration } from "../../utils/mediaDuration.js";
import { logger } from "../../utils/logger.js";
import { tryImport } from "../../utils/tryImport.js";

let _musicMetadata: typeof import("music-metadata") | null = null;
async function loadMusicMetadata() {
  if (_musicMetadata) {
    return _musicMetadata;
  }
  _musicMetadata = await tryImport<typeof import("music-metadata")>(
    "music-metadata",
    "Audio processing",
  );
  return _musicMetadata;
}

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Audio processor configuration constants.
 */
const AUDIO_CONFIG = {
  /** Maximum audio file size in MB (uses centralized constant from sizeLimits) */
  MAX_SIZE_MB: SIZE_LIMITS_MB.AUDIO_MAX_MB,
  /** Processing timeout in milliseconds (audio metadata parsing is fast) */
  TIMEOUT_MS: 30000,
  /** Maximum file size for Whisper API transcription (25MB) */
  WHISPER_MAX_SIZE_MB: 25,
  /** Transcription timeout in milliseconds (120 seconds for large files) */
  TRANSCRIPTION_TIMEOUT_MS: 120_000,
  /** Whisper-supported audio formats */
  WHISPER_SUPPORTED_FORMATS: [
    "mp3",
    "mp4",
    "mpeg",
    "mpga",
    "m4a",
    "wav",
    "webm",
    "flac",
    "ogg",
  ] as readonly string[],
} as const;

/**
 * Supported MIME types for audio files.
 *
 * Derived from the canonical registry so this processor cannot claim a format
 * the detector standing in front of it does not recognise. It previously did:
 * .aiff, .amr, .ape, .wv and .oga were all declared here and all resolved to
 * "unknown" during detection, so a file in one of those formats never reached
 * this processor at all.
 *
 * `audio/webm` is appended because WebM is registered as a video container and
 * an audio-only .webm is legitimate input. Only the MIME type is accepted, not
 * the extension: `isFileSupported` matches on extension OR mimetype, so
 * claiming `.webm` here made `isAudioFile("video/webm", "clip.webm")` accept a
 * video-only WebM as audio on its filename alone.
 */
const SUPPORTED_AUDIO_MIME_TYPES: readonly string[] = [
  ...mimeTypesForModality("audio"),
  "audio/webm",
];

/**
 * Supported file extensions for audio files.
 * Derived from the canonical registry — see the note above.
 */
const SUPPORTED_AUDIO_EXTENSIONS: readonly string[] =
  extensionsForModality("audio");

// =============================================================================
// AUDIO PROCESSOR CLASS
// =============================================================================

/**
 * Audio Processor - extracts metadata and tags from audio files for LLM consumption.
 *
 * Audio files cannot be directly sent to most language models. This processor
 * parses audio file headers to extract structured metadata (duration, codec,
 * bitrate, sample rate, channels) and embedded tags (title, artist, album, etc.),
 * then builds a human-readable text summary for the AI to reason about.
 *
 * Uses the `music-metadata` library which is a pure JavaScript implementation
 * with no native dependencies, making it safe for all deployment environments.
 *
 * @example
 * ```typescript
 * const processor = new AudioProcessor();
 *
 * const result = await processor.processFile({
 *   id: 'audio-123',
 *   name: 'song.mp3',
 *   mimetype: 'audio/mpeg',
 *   size: 5242880,
 *   buffer: audioBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(result.data.textContent);
 *   // "[Audio File: song.mp3]
 *   //  Duration: 3:45 | Codec: MPEG 1 Layer 3 | Bitrate: 320 kbps | ..."
 * }
 * ```
 */
export class AudioProcessor extends BaseFileProcessor<ProcessedAudio> {
  constructor() {
    super({
      maxSizeMB: AUDIO_CONFIG.MAX_SIZE_MB,
      timeoutMs: AUDIO_CONFIG.TIMEOUT_MS,
      supportedMimeTypes: [...SUPPORTED_AUDIO_MIME_TYPES],
      supportedExtensions: [...SUPPORTED_AUDIO_EXTENSIONS],
      fileTypeName: "audio",
      defaultFilename: "audio.mp3",
    });
  }

  // ===========================================================================
  // PROCESSING OVERRIDE
  // ===========================================================================

  /**
   * Override processFile for async audio metadata parsing with music-metadata.
   *
   * Processing pipeline:
   * 1. Validate file type and size (base class)
   * 2. Get file buffer (from direct buffer or download)
   * 3. Parse audio metadata using music-metadata's parseBuffer()
   * 4. Extract tags (title, artist, album, etc.)
   * 5. Extract embedded cover art if present
   * 6. Build LLM-friendly text content
   *
   * @param fileInfo - File information (can include URL or buffer)
   * @param options - Optional processing options (auth headers, timeout, etc.)
   * @returns Processing result with audio metadata or error
   */
  override async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<ProcessorFileProcessingResult<ProcessedAudio>> {
    try {
      // Step 1: Validate file type and size
      const validationResult = this.validateFileWithResult(fileInfo);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Step 2: Get file buffer (from direct buffer or download from URL)
      let buffer: Buffer;

      if (fileInfo.buffer) {
        buffer = fileInfo.buffer;
      } else if (fileInfo.url) {
        const downloadResult = await this.downloadFileWithRetry(
          fileInfo,
          options,
        );
        if (!downloadResult.success) {
          return {
            success: false,
            error: downloadResult.error,
          };
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

        // Validate actual downloaded size against limit
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

      // Step 3: Parse audio metadata using music-metadata
      const audioMetadata = await this.parseAudioMetadata(buffer, fileInfo);

      // Step 4: Extract structured metadata from parsed result
      const metadata = this.extractMetadata(audioMetadata, buffer.length);

      // Step 5: Extract tags from common metadata
      const tags = this.extractTags(audioMetadata);

      // Step 6: Extract embedded cover art if present
      const coverArt = await this.extractCoverArt(audioMetadata);

      // Step 7: Attempt transcription if API key is available
      const filename = this.getFilename(fileInfo);
      const transcriptionResult = await this.attemptTranscription(
        buffer,
        filename,
        fileInfo.mimetype,
      );

      // Step 8: Build LLM-friendly text content (includes transcript if available)
      const textContent = this.buildTextContent(
        filename,
        metadata,
        tags,
        transcriptionResult.transcript,
      );

      return {
        success: true,
        data: {
          textContent,
          metadata,
          tags,
          transcript: transcriptionResult.transcript,
          hasTranscript: transcriptionResult.hasTranscript,
          transcriptionProvider: transcriptionResult.transcriptionProvider,
          ...(transcriptionResult.transcriptionSkippedReason
            ? {
                transcriptionSkippedReason:
                  transcriptionResult.transcriptionSkippedReason,
              }
            : {}),
          coverArt: coverArt ?? undefined,
          buffer,
          mimetype: fileInfo.mimetype || "audio/mpeg",
          size: fileInfo.size,
          filename,
        },
      };
    } catch (error) {
      // Classify music-metadata parse errors as INVALID_FORMAT
      // (corrupt/truncated files, unsupported codec variants, etc.)
      const isParseError =
        error instanceof Error &&
        (error.message.includes("parse") ||
          error.message.includes("codec") ||
          error.message.includes("header") ||
          error.message.includes("format") ||
          error.message.includes("unexpected end") ||
          error.name === "CouldNotDetermineFileTypeError" ||
          error.name === "UnsupportedFileTypeError");

      const errorCode = isParseError
        ? FileErrorCode.INVALID_FORMAT
        : FileErrorCode.PROCESSING_FAILED;

      return {
        success: false,
        error: this.createError(
          errorCode,
          {
            fileType: "audio",
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  // ===========================================================================
  // PRIVATE: AUDIO TRANSCRIPTION
  // ===========================================================================

  /**
   * Attempt to transcribe audio using the Vercel AI SDK's `transcribe()` function
   * with the OpenAI Whisper model.
   *
   * Transcription is attempted when:
   * 1. `OPENAI_API_KEY` environment variable is set
   * 2. File size is within Whisper's 25MB limit
   * 3. File format is supported by Whisper
   *
   * Gracefully degrades: if transcription fails for any reason, metadata-only
   * output is returned (transcription is additive, never blocks processing).
   *
   * @param buffer - Audio file content
   * @param filename - Original filename (used for format detection)
   * @param mimetype - MIME type of the audio file
   * @returns Transcription result with transcript text, or empty result
   */
  private async attemptTranscription(
    buffer: Buffer,
    filename: string,
    mimetype: string | undefined,
  ): Promise<{
    transcript: string | undefined;
    hasTranscript: boolean;
    transcriptionProvider: string | undefined;
    /**
     * Why no transcript was produced (#416). Every exit below used to return an
     * indistinguishable empty result, so "no OPENAI_API_KEY", "file too large",
     * "format Whisper can't read" and "the API call failed" were impossible to
     * tell apart — from the outside it just looked like the audio had no speech.
     */
    transcriptionSkippedReason: string | undefined;
  }> {
    const skipped = (reason: string) => {
      logger.warn(
        `[AudioProcessor] No transcript for ${filename}: ${reason}. ` +
          `The model will receive metadata only.`,
      );
      return {
        transcript: undefined,
        hasTranscript: false,
        transcriptionProvider: undefined,
        transcriptionSkippedReason: reason,
      };
    };

    // Check if OPENAI_API_KEY is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return skipped(
        "OPENAI_API_KEY is not set, and Whisper is the only transcription backend wired up",
      );
    }

    // Check file size (Whisper limit is 25MB)
    const fileSizeMB = buffer.length / (1024 * 1024);
    if (fileSizeMB > AUDIO_CONFIG.WHISPER_MAX_SIZE_MB) {
      return skipped(
        `file is ${fileSizeMB.toFixed(1)}MB, over Whisper's ${AUDIO_CONFIG.WHISPER_MAX_SIZE_MB}MB limit — split or compress it`,
      );
    }

    // Check if file format is supported by Whisper
    const ext = filename.split(".").pop()?.toLowerCase();
    const isFormatSupported =
      ext && AUDIO_CONFIG.WHISPER_SUPPORTED_FORMATS.includes(ext);
    const isMimeSupported =
      mimetype &&
      (mimetype.startsWith("audio/mpeg") ||
        mimetype.startsWith("audio/mp4") ||
        mimetype.startsWith("audio/wav") ||
        mimetype.startsWith("audio/webm") ||
        mimetype.startsWith("audio/flac") ||
        mimetype.startsWith("audio/ogg") ||
        mimetype.startsWith("audio/x-m4a"));

    if (!isFormatSupported && !isMimeSupported) {
      return skipped(
        `format is not one Whisper accepts (extension "${ext ?? "none"}", mimetype "${mimetype ?? "none"}"); supported: ${AUDIO_CONFIG.WHISPER_SUPPORTED_FORMATS.join(", ")}`,
      );
    }

    try {
      // Dynamic imports to avoid loading these modules when transcription is not needed
      const [{ createOpenAI }, { experimental_transcribe }] = await Promise.all(
        [import("@ai-sdk/openai"), import("../../utils/generation.js")],
      );

      const openai = createOpenAI({ apiKey });
      const model = openai.transcription("whisper-1");

      // Wrap in withTimeout — large audio files can take a while, but a
      // stalled request shouldn't block the processor forever. A TimeoutError
      // lands in the same handler as other failures below, which reports it as
      // the reason rather than discarding it.
      const result = await withTimeout(
        experimental_transcribe({
          model,
          audio: buffer,
        }),
        AUDIO_CONFIG.TRANSCRIPTION_TIMEOUT_MS,
        "openai-whisper",
        "generate",
      );

      if (result.text && result.text.trim().length > 0) {
        logger.debug(
          `[AudioProcessor] Transcribed ${filename} via openai-whisper (${result.text.trim().length} chars)`,
        );
        return {
          transcript: result.text.trim(),
          hasTranscript: true,
          transcriptionProvider: "openai-whisper",
          transcriptionSkippedReason: undefined,
        };
      }

      // A successful call that returned nothing is a legitimate outcome
      // (silence, music, no speech) — distinct from a failure.
      return skipped("Whisper returned an empty transcript for this audio");
    } catch (error) {
      // Transcription stays best-effort — a failure must never kill the whole
      // processing pipeline. But discarding the error outright, as this block
      // used to, made a bad API key, a rate limit and a network blip all look
      // identical to "this file has no speech in it".
      const message = error instanceof Error ? error.message : String(error);
      return skipped(`transcription request failed — ${message}`);
    }
  }

  // ===========================================================================
  // STUB: buildProcessedResult (required by base class, unused due to override)
  // ===========================================================================

  /**
   * Stub implementation required by BaseFileProcessor.
   * Not used because processFile is fully overridden.
   *
   * @param buffer - File buffer
   * @param fileInfo - File information
   * @returns Empty ProcessedAudio structure
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedAudio {
    return {
      textContent: "",
      metadata: {
        duration: 0,
        durationFormatted: formatMediaDuration(0),
        codec: "unknown",
        lossless: false,
        fileSize: buffer.length,
      },
      tags: {},
      hasTranscript: false,
      buffer,
      mimetype: fileInfo.mimetype || "audio/mpeg",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  // ===========================================================================
  // PRIVATE: METADATA PARSING
  // ===========================================================================

  /**
   * Parse audio metadata from a buffer using music-metadata.
   *
   * @param buffer - Audio file content
   * @param fileInfo - File information (used for MIME type hint)
   * @returns Parsed audio metadata from music-metadata
   * @throws Error if the buffer cannot be parsed (corrupt file, unsupported format)
   */
  private async parseAudioMetadata(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): Promise<import("music-metadata").IAudioMetadata> {
    // Provide MIME type as a string hint to music-metadata for more accurate parsing.
    // parseBuffer accepts (Uint8Array, fileInfo?: IFileInfo | string, options?)
    // where string is interpreted as MIME type.
    const mimeType = fileInfo.mimetype || undefined;

    const { parseBuffer } = await loadMusicMetadata();
    return parseBuffer(buffer, mimeType);
  }

  /**
   * Extract structured metadata from the parsed audio format information.
   *
   * @param audioMetadata - Parsed audio metadata from music-metadata
   * @param fileSize - File size in bytes
   * @returns Structured metadata object
   */
  private extractMetadata(
    audioMetadata: import("music-metadata").IAudioMetadata,
    fileSize: number,
  ): ProcessedAudio["metadata"] {
    const format = audioMetadata.format;

    const duration = format.duration ?? 0;
    const durationFormatted = this.formatDuration(duration);

    return {
      duration,
      durationFormatted,
      codec: format.codec ?? format.container ?? "unknown",
      codecProfile: format.codecProfile ?? undefined,
      bitrate: format.bitrate ?? undefined,
      sampleRate: format.sampleRate ?? undefined,
      channels: format.numberOfChannels ?? undefined,
      bitsPerSample: format.bitsPerSample ?? undefined,
      lossless: format.lossless ?? false,
      fileSize,
    };
  }

  /**
   * Extract common tags from the parsed audio metadata.
   *
   * Maps music-metadata's common tag format to our simplified tag structure.
   * Handles array-to-scalar conversions (e.g., comment[] -> first comment string).
   *
   * @param audioMetadata - Parsed audio metadata from music-metadata
   * @returns Simplified tag object
   */
  private extractTags(
    audioMetadata: import("music-metadata").IAudioMetadata,
  ): ProcessedAudio["tags"] {
    const common = audioMetadata.common;

    return {
      title: common.title ?? undefined,
      artist: common.artist ?? undefined,
      album: common.album ?? undefined,
      year: common.year ?? undefined,
      genre: common.genre && common.genre.length > 0 ? common.genre : undefined,
      track:
        common.track.no !== null || common.track.of !== null
          ? { no: common.track.no, of: common.track.of }
          : undefined,
      comment:
        common.comment && common.comment.length > 0
          ? (common.comment[0]?.text ?? undefined)
          : undefined,
      composer:
        common.composer && common.composer.length > 0
          ? common.composer[0]
          : undefined,
    };
  }

  /**
   * Extract embedded cover art from the audio file.
   *
   * Uses music-metadata's selectCover() to pick the most appropriate
   * cover image when multiple are embedded (e.g., front cover vs. back cover).
   *
   * @param audioMetadata - Parsed audio metadata from music-metadata
   * @returns Cover art as Buffer, or null if no cover art is embedded
   */
  private async extractCoverArt(
    audioMetadata: import("music-metadata").IAudioMetadata,
  ): Promise<Buffer | null> {
    const pictures = audioMetadata.common.picture;
    if (!pictures || pictures.length === 0) {
      return null;
    }

    const { selectCover } = await loadMusicMetadata();
    const cover = selectCover(pictures);
    if (!cover) {
      return null;
    }

    return Buffer.from(cover.data);
  }

  // ===========================================================================
  // PRIVATE: TEXT CONTENT BUILDING
  // ===========================================================================

  /**
   * Build an LLM-friendly text representation of the audio file.
   *
   * Produces a structured text block that gives the AI context about the
   * audio file without requiring the actual audio stream. The format is
   * designed to be scannable and information-dense.
   *
   * @param filename - Original filename
   * @param metadata - Extracted audio metadata
   * @param tags - Extracted audio tags
   * @param transcript - Optional transcribed text from Whisper
   * @returns Formatted text content string
   *
   * @example Output:
   * ```
   * [Audio File: song.mp3]
   * Duration: 3:45 | Codec: MPEG 1 Layer 3 | Bitrate: 320 kbps | Sample Rate: 44100 Hz | Channels: 2 (Stereo) | Lossless: No
   * File Size: 5.00 MB
   * Title: Yesterday | Artist: The Beatles | Album: Help! | Year: 1965 | Genre: Rock, Pop
   * Track: 1/14 | Composer: Lennon-McCartney
   *
   * --- Transcript ---
   * [full transcribed text here]
   * ```
   */
  private buildTextContent(
    filename: string,
    metadata: ProcessedAudio["metadata"],
    tags: ProcessedAudio["tags"],
    transcript?: string,
  ): string {
    const lines: string[] = [];

    // Header line
    lines.push(`[Audio File: ${filename}]`);

    // Technical metadata line
    const techParts: string[] = [];
    techParts.push(`Duration: ${metadata.durationFormatted}`);
    techParts.push(`Codec: ${metadata.codec}`);
    if (metadata.codecProfile) {
      techParts.push(`Profile: ${metadata.codecProfile}`);
    }
    if (metadata.bitrate) {
      techParts.push(`Bitrate: ${this.formatBitrate(metadata.bitrate)}`);
    }
    if (metadata.sampleRate) {
      techParts.push(`Sample Rate: ${metadata.sampleRate} Hz`);
    }
    if (metadata.channels) {
      techParts.push(
        `Channels: ${metadata.channels} (${this.getChannelLabel(metadata.channels)})`,
      );
    }
    if (metadata.bitsPerSample) {
      techParts.push(`Bit Depth: ${metadata.bitsPerSample}-bit`);
    }
    techParts.push(`Lossless: ${metadata.lossless ? "Yes" : "No"}`);
    lines.push(techParts.join(" | "));

    // File size line
    lines.push(
      `File Size: ${(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB`,
    );

    // Tags line (only if any tags are present)
    const tagParts: string[] = [];
    if (tags.title) {
      tagParts.push(`Title: ${tags.title}`);
    }
    if (tags.artist) {
      tagParts.push(`Artist: ${tags.artist}`);
    }
    if (tags.album) {
      tagParts.push(`Album: ${tags.album}`);
    }
    if (tags.year) {
      tagParts.push(`Year: ${tags.year}`);
    }
    if (tags.genre && tags.genre.length > 0) {
      tagParts.push(`Genre: ${tags.genre.join(", ")}`);
    }

    if (tagParts.length > 0) {
      lines.push(tagParts.join(" | "));
    }

    // Secondary tags line (track, composer, comment)
    const secondaryParts: string[] = [];
    if (tags.track) {
      const trackStr =
        tags.track.of !== null
          ? `${tags.track.no ?? "?"}/${tags.track.of}`
          : `${tags.track.no ?? "?"}`;
      secondaryParts.push(`Track: ${trackStr}`);
    }
    if (tags.composer) {
      secondaryParts.push(`Composer: ${tags.composer}`);
    }
    if (tags.comment) {
      secondaryParts.push(`Comment: ${tags.comment}`);
    }

    if (secondaryParts.length > 0) {
      lines.push(secondaryParts.join(" | "));
    }

    // Transcript section (if transcription was performed)
    if (transcript) {
      lines.push("");
      lines.push("--- Transcript ---");
      lines.push(transcript);
    }

    return lines.join("\n");
  }

  // ===========================================================================
  // PRIVATE: FORMATTING UTILITIES
  // ===========================================================================

  /**
   * Format a duration in seconds to a human-readable string.
   *
   * Delegates to the shared formatter so audio and video describe the same
   * file the same way — this used to render "0:02" where VideoProcessor
   * rendered "2s".
   *
   * @param seconds - Duration in seconds
   * @returns Formatted string: "45s", "3m 45s", "1h 2m 30s"
   */
  private formatDuration(seconds: number): string {
    return formatMediaDuration(seconds);
  }

  /**
   * Format bitrate to a human-readable string.
   *
   * @param bitrate - Bitrate in bits per second
   * @returns Formatted string (e.g., "320 kbps", "1411 kbps")
   */
  private formatBitrate(bitrate: number): string {
    const kbps = Math.round(bitrate / 1000);
    return `${kbps} kbps`;
  }

  /**
   * Get a human-readable label for the number of audio channels.
   *
   * @param channels - Number of audio channels
   * @returns Channel label (e.g., "Mono", "Stereo", "5.1 Surround")
   */
  private getChannelLabel(channels: number): string {
    switch (channels) {
      case 1:
        return "Mono";
      case 2:
        return "Stereo";
      case 6:
        return "5.1 Surround";
      case 8:
        return "7.1 Surround";
      default:
        return `${channels}ch`;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Audio processor instance.
 * Use this for standard audio processing operations.
 *
 * @example
 * ```typescript
 * import { audioProcessor } from "./AudioProcessor.js";
 *
 * const result = await audioProcessor.processFile(fileInfo);
 * ```
 */
export const audioProcessor = new AudioProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an audio file.
 * Matches by MIME type or file extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is an audio file
 *
 * @example
 * ```typescript
 * if (isAudioFile('audio/mpeg', 'song.mp3')) {
 *   // Process as audio
 * }
 *
 * if (isAudioFile('', 'recording.flac')) {
 *   // Also matches by extension
 * }
 * ```
 */
export function isAudioFile(mimetype: string, filename: string): boolean {
  return audioProcessor.isFileSupported(mimetype, filename);
}

/**
 * Process a single audio file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, etc.)
 * @returns Processing result with audio metadata or error
 *
 * @example
 * ```typescript
 * import { processAudio } from "./AudioProcessor.js";
 *
 * const result = await processAudio({
 *   id: 'audio-1',
 *   name: 'podcast.mp3',
 *   mimetype: 'audio/mpeg',
 *   size: 15728640,
 *   buffer: mp3Buffer,
 * });
 *
 * if (result.success) {
 *   const { metadata, tags, textContent } = result.data;
 *   console.log(`${tags.title} by ${tags.artist} (${metadata.durationFormatted})`);
 *   // Send textContent to LLM for analysis
 * } else {
 *   console.error(`Processing failed: ${result.error?.userMessage}`);
 * }
 * ```
 */
export async function processAudio(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<ProcessorFileProcessingResult<ProcessedAudio>> {
  return audioProcessor.processFile(fileInfo, options);
}
