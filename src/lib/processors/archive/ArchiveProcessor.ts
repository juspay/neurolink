/**
 * Archive Processor
 *
 * Handles downloading, validating, and processing archive files (ZIP, TAR, TAR.GZ, GZ).
 * Extracts file listings with metadata for AI consumption without recursively
 * processing individual entries through other processors (Phase 1).
 *
 * Key features:
 * - ZIP support via adm-zip (dynamic import)
 * - TAR / TAR.GZ support via tar-stream (dynamic import)
 * - Plain GZ support via Node zlib
 * - Comprehensive security validation (path traversal, zip bombs, symlinks, encryption)
 * - In-memory extraction with configurable size limits
 * - Structured text output for LLM consumption
 *
 * @module processors/archive/ArchiveProcessor
 *
 * @example
 * ```typescript
 * import { archiveProcessor, processArchive, isArchiveFile } from "./ArchiveProcessor.js";
 *
 * // Check if a file is an archive
 * if (isArchiveFile(fileInfo.mimetype, fileInfo.name)) {
 *   const result = await processArchive(fileInfo, {
 *     authHeaders: { Authorization: "Bearer token" },
 *   });
 *
 *   if (result.success) {
 *     console.log(`Format: ${result.data.archiveMetadata.format}`);
 *     console.log(`Entries: ${result.data.archiveMetadata.totalEntries}`);
 *     for (const entry of result.data.entries) {
 *       console.log(`  ${entry.name} (${entry.uncompressedSize} bytes)`);
 *     }
 *   }
 * }
 * ```
 */

import * as path from "path";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  ArchiveDecompressionResult,
  ArchiveEntry,
  ArchiveFormat,
  FileInfo,
  FileProcessingError,
  ProcessedArchive,
  ProcessorFileProcessingResult,
  ProcessOptions,
} from "../../types/index.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import { FileErrorCode } from "../errors/index.js";

// =============================================================================
// TYPES
// =============================================================================


// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Security limits for archive processing.
 * These values are intentionally conservative to prevent resource exhaustion
 * and common archive-based attacks (zip bombs, path traversal, etc.).
 */
const ARCHIVE_SECURITY = {
  /** Maximum number of entries allowed in a single archive */
  MAX_ENTRIES: 1000,
  /** Maximum total decompressed size allowed (100 MB) */
  MAX_DECOMPRESSED_SIZE: 100 * 1024 * 1024,
  /** Maximum size of any single file within the archive (20 MB) */
  MAX_SINGLE_FILE_SIZE: 20 * 1024 * 1024,
  /** Maximum compression ratio before flagging as potential zip bomb */
  MAX_COMPRESSION_RATIO: 100,
  /**
   * Maximum archive nesting depth.
   * Phase 1 only lists contents (no recursive extraction), so depth is 1.
   */
  MAX_NESTING_DEPTH: 1,
  /** Maximum path length for any entry name */
  MAX_PATH_LENGTH: 255,
  /** Whether to allow encrypted archive entries */
  ALLOW_ENCRYPTED: false,
  /** Whether to allow symbolic link entries */
  ALLOW_SYMLINKS: false,
} as const;

/**
 * Archive processor configuration constants.
 */
const ARCHIVE_CONFIG = {
  /** Maximum archive file size in MB (uses centralized constant from sizeLimits) */
  MAX_SIZE_MB: SIZE_LIMITS_MB.ARCHIVE_MAX_MB,
  /** Processing timeout in milliseconds (60 seconds) */
  TIMEOUT_MS: 60_000,
  /** Maximum number of entries to extract content from (Phase 2 sub-processing) */
  MAX_EXTRACT_ENTRIES: 20,
  /** Maximum size of a single entry to extract for content processing (1 MB) */
  MAX_EXTRACT_ENTRY_SIZE: 1 * 1024 * 1024,
  /** Maximum total extracted content size across all entries (5 MB) */
  MAX_TOTAL_EXTRACT_SIZE: 5 * 1024 * 1024,
  /** File extensions eligible for content extraction inside archives */
  EXTRACTABLE_EXTENSIONS: new Set([
    ".ts",
    ".js",
    ".tsx",
    ".jsx",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".swift",
    ".kt",
    ".scala",
    ".sh",
    ".bash",
    ".txt",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".html",
    ".css",
    ".sql",
    ".toml",
    ".ini",
    ".cfg",
    ".env",
    ".csv",
    ".log",
    ".conf",
    ".dockerfile",
    ".makefile",
    ".gitignore",
    ".editorconfig",
  ]),
} as const;

// =============================================================================
// SUPPORTED FORMATS
// =============================================================================

/** MIME types recognized as archive formats */
const SUPPORTED_ARCHIVE_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/x-tar",
  "application/x-gtar",
  "application/gzip",
  "application/x-gzip",
  "application/x-compressed-tar",
  "application/x-bzip2",
  // XZ and Zstandard, added alongside the extensions above: a caller that
  // uploads bytes with a declared mimetype and no filename was rejected at the
  // type gate for the two formats this change teaches the processor to read.
  "application/x-xz",
  "application/zstd",
  "application/java-archive",
] as const;

/**
 * External decompressor per single-stream format.
 *
 * One map rather than a ternary repeated at each use: the decompressor and the
 * error message that names it were derived separately, so they could disagree
 * about which binary the user is being told to install.
 */
const SINGLE_STREAM_TOOLS: Record<"bz2" | "xz" | "zst", string> = {
  bz2: "bzip2",
  xz: "xz",
  zst: "zstd",
};

/**
 * Whether a zlib rejection is the output bound firing rather than bad input.
 *
 * `maxOutputLength` aborts an inflate the moment its output would pass the cap,
 * which is the whole point — but it surfaces as a plain `RangeError`, and a
 * bomb reported as "failed to decompress" reads as a corrupt upload and invites
 * the user to send it again. It will fail identically every time.
 *
 * Keyed on `code`, not the message: the message embeds a byte count.
 */
const isDecompressionBoundExceeded = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ERR_BUFFER_TOO_LARGE";

/** File extensions recognized as archive formats */
const SUPPORTED_ARCHIVE_EXTENSIONS = [".zip", ".tar", ".gz", ".tgz", ".bz2", ".tbz2", ".jar", ".xz", ".txz", ".zst", ".tzst"] as const;

// =============================================================================
// MAGIC BYTE SIGNATURES
// =============================================================================

/**
 * Magic byte signatures for archive format detection.
 * Used alongside file extension for robust format identification.
 */
const MAGIC_BYTES = {
  /** ZIP/JAR: PK\x03\x04 */
  ZIP: [0x50, 0x4b, 0x03, 0x04],
  /** ZIP empty archive: PK\x05\x06 */
  ZIP_EMPTY: [0x50, 0x4b, 0x05, 0x06],
  /** ZIP spanned: PK\x07\x08 */
  ZIP_SPANNED: [0x50, 0x4b, 0x07, 0x08],
  /** GZIP: \x1f\x8b */
  GZIP: [0x1f, 0x8b],
  /**
   * BZIP2: `BZh` — all three bytes, not just `BZ`.
   *
   * Two bytes was harmless while every BZIP2 match was rejected outright as an
   * unsupported format. Now that a match actually spawns `bzip2`, any buffer
   * beginning with the ASCII letters "BZ" is handed to the decompressor and
   * comes back reported as a corrupt BZ2 stream — a confident wrong answer
   * about a file that was never bzip2 at all.
   */
  BZIP2: [0x42, 0x5a, 0x68],
  /** XZ: \xfd7zXZ\x00 */
  XZ: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00],
  /** Zstandard frame: \x28\xb5\x2f\xfd */
  ZSTD: [0x28, 0xb5, 0x2f, 0xfd],
  /** RAR: Rar!\x1a\x07 */
  RAR: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
  /** 7-Zip: 7z\xbc\xaf\x27\x1c */
  SEVEN_ZIP: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
} as const;

// =============================================================================
// ARCHIVE PROCESSOR CLASS
// =============================================================================

/**
 * Archive Processor - handles ZIP, TAR, TAR.GZ, and plain GZ files.
 *
 * Overrides the base `processFile()` to implement a custom pipeline:
 * 1. Validate file type and size
 * 2. Obtain the archive buffer (from provided buffer or URL download)
 * 3. Detect the archive format via magic bytes and file extension
 * 4. Run security validation (path traversal, zip bombs, encryption, symlinks)
 * 5. Extract entry metadata (no recursive file processing in Phase 1)
 * 6. Build LLM-friendly text content with file listing
 *
 * RAR and 7z formats are detected but not yet supported for extraction.
 *
 * @example
 * ```typescript
 * const processor = new ArchiveProcessor();
 *
 * const result = await processor.processFile(fileInfo, {
 *   authHeaders: { Authorization: "Bearer token" },
 * });
 *
 * if (result.success) {
 *   console.log(`Format: ${result.data.archiveMetadata.format}`);
 *   console.log(`Entries: ${result.data.entries.length}`);
 *   console.log(result.data.textContent);
 * }
 * ```
 */
export class ArchiveProcessor extends BaseFileProcessor<ProcessedArchive> {
  constructor() {
    super({
      maxSizeMB: ARCHIVE_CONFIG.MAX_SIZE_MB,
      timeoutMs: ARCHIVE_CONFIG.TIMEOUT_MS,
      supportedMimeTypes: [...SUPPORTED_ARCHIVE_MIME_TYPES],
      supportedExtensions: [...SUPPORTED_ARCHIVE_EXTENSIONS],
      fileTypeName: "archive",
      defaultFilename: "archive.zip",
    });
  }

  // ===========================================================================
  // ABSTRACT METHOD IMPLEMENTATION
  // ===========================================================================

  /**
   * Build a stub processed result.
   * The actual work is done in the `processFile()` override; this method
   * satisfies the abstract contract from `BaseFileProcessor`.
   *
   * @param buffer - Raw archive buffer
   * @param fileInfo - Original file information
   * @returns Empty ProcessedArchive scaffold
   */
  protected override buildProcessedResult(buffer: Buffer, fileInfo: FileInfo): ProcessedArchive {
    return {
      buffer,
      mimetype: fileInfo.mimetype || "application/octet-stream",
      size: buffer.length,
      filename: this.getFilename(fileInfo),
      textContent: "",
      archiveMetadata: {
        format: "zip",
        totalEntries: 0,
        totalUncompressedSize: 0,
        totalCompressedSize: 0,
      },
      entries: [],
      securityWarnings: [],
    };
  }

  // ===========================================================================
  // MAIN PROCESSING PIPELINE (override)
  // ===========================================================================

  /**
   * Process an archive file through the full extraction pipeline.
   *
   * @param fileInfo - File information (can include URL or buffer)
   * @param options - Optional processing options (auth headers, timeout, etc.)
   * @returns Processing result with archive metadata and entry listing, or error
   */
  override async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<ProcessorFileProcessingResult<ProcessedArchive>> {
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
        const downloadResult = await this.downloadFileWithRetry(fileInfo, options);
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

      // Step 3: Detect archive format
      const filename = this.getFilename(fileInfo);
      const format = this.detectArchiveFormat(buffer, filename);

      if (!format) {
        return {
          success: false,
          error: this.createError(FileErrorCode.INVALID_FORMAT, {
            reason: "Unable to detect archive format from magic bytes or file extension",
          }),
        };
      }

      // Step 4: Check for unsupported formats (RAR, 7z)
      if (format === "rar" || format === "7z") {
        return {
          success: false,
          error: this.createError(FileErrorCode.UNSUPPORTED_TYPE, {
            format,
            reason: `${format.toUpperCase()} archives are not yet supported. Please convert to ZIP or TAR format.`,
            supportedFormats: "ZIP, TAR, TAR.GZ, TAR.BZ2, GZ, BZ2, XZ, ZST, JAR",
          }),
        };
      }

      // Step 5: Extract entries based on format
      const extractionResult = await this.extractEntries(buffer, format);

      if (!extractionResult.success) {
        return {
          success: false,
          error: extractionResult.error as FileProcessingError,
        };
      }

      const { entries, securityWarnings } = extractionResult;

      // Step 6: Compute aggregate metadata
      const totalUncompressedSize = entries.reduce((sum, e) => sum + e.uncompressedSize, 0);
      const totalCompressedSize = entries.reduce((sum, e) => sum + e.compressedSize, 0);

      // Step 7: Security check - overall compression ratio
      if (buffer.length > 0 && totalUncompressedSize > 0) {
        const overallRatio = totalUncompressedSize / buffer.length;
        if (overallRatio > ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO) {
          return {
            success: false,
            error: this.createError(FileErrorCode.ZIP_BOMB_DETECTED, {
              compressionRatio: overallRatio.toFixed(1),
              maxRatio: ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO,
            }),
          };
        }
      }

      // Step 8: Security check - total decompressed size
      if (totalUncompressedSize > ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE) {
        return {
          success: false,
          error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Total decompressed size (${this.formatSizeMB(totalUncompressedSize)} MB) exceeds limit (${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB)`,
          }),
        };
      }

      // Step 9: Extract content from text-based entries (Phase 2 sub-processing)
      // For ZIP archives, extract and include content from small text-based files.
      // Skips nested archives and binary files for safety.
      // ZIP re-parses to pull member text; every other format collects it while
      // decompressing, because their bytes stream past exactly once.
      let extractedContents: Map<string, string> =
        extractionResult.contents ?? new Map();
      if (format === "zip") {
        extractedContents = await this.extractEntryContents(buffer, entries);
      }

      // Step 10: Build text content for LLM
      const archiveMetadata = {
        format,
        totalEntries: entries.length,
        totalUncompressedSize,
        totalCompressedSize,
      };

      const textContent = this.buildTextContent(
        filename,
        archiveMetadata,
        entries,
        securityWarnings,
        extractedContents,
      );

      // Step 10: Build final result
      return {
        success: true,
        data: {
          buffer,
          mimetype: fileInfo.mimetype || "application/octet-stream",
          size: buffer.length,
          filename,
          textContent,
          archiveMetadata,
          entries,
          securityWarnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError(
          FileErrorCode.PROCESSING_FAILED,
          {
            fileType: "archive",
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  // ===========================================================================
  // FORMAT DETECTION
  // ===========================================================================

  /**
   * Detect the archive format using magic bytes and file extension.
   * Magic bytes take precedence over extension when available.
   *
   * @param buffer - Raw archive buffer
   * @param filename - Original filename for extension-based fallback
   * @returns Detected archive format, or null if unrecognized
   */
  private detectArchiveFormat(buffer: Buffer, filename: string): ArchiveFormat | null {
    // Try magic bytes first (most reliable)
    const magicFormat = this.detectFormatFromMagicBytes(buffer);
    if (magicFormat) {
      // For GZIP, check if it wraps a TAR archive
      if (magicFormat === "gz") {
        const ext = filename.toLowerCase();
        if (ext.endsWith(".tar.gz") || ext.endsWith(".tgz") || ext.endsWith(".tbz2")) {
          return "tar.gz";
        }
        // Could still be a tar.gz without the extension - we'll detect during extraction
        return "gz";
      }
      // Bzip2 wraps a tar just as often, and now that a BZIP2 magic match
      // resolves to a real format rather than being rejected outright, the
      // same filename check has to run here too. Without it every genuine
      // `.tar.bz2` reported its format as "BZ2" to the model — extraction was
      // right, the label was not — and the `.tar.bz2` extension mapping below
      // became unreachable for any well-formed file.
      if (magicFormat === "bz2") {
        const ext = filename.toLowerCase();
        return ext.endsWith(".tar.bz2") || ext.endsWith(".tbz2")
          ? "tar.bz2"
          : "bz2";
      }
      return magicFormat;
    }

    // Fallback to extension-based detection
    return this.detectFormatFromExtension(filename);
  }

  /**
   * Detect archive format from magic bytes at the start of the buffer.
   *
   * @param buffer - Raw archive buffer
   * @returns Detected format, or null if magic bytes don't match any known format
   */
  private detectFormatFromMagicBytes(buffer: Buffer): ArchiveFormat | null {
    if (buffer.length < 2) {
      return null;
    }

    // Check for 7-Zip (6 bytes)
    if (buffer.length >= 6 && this.matchesMagic(buffer, MAGIC_BYTES.SEVEN_ZIP)) {
      return "7z";
    }

    // Check for RAR (6+ bytes)
    if (buffer.length >= 6 && this.matchesMagic(buffer, MAGIC_BYTES.RAR)) {
      return "rar";
    }

    // Check for ZIP/JAR (4 bytes)
    if (
      buffer.length >= 4 &&
      (this.matchesMagic(buffer, MAGIC_BYTES.ZIP) ||
        this.matchesMagic(buffer, MAGIC_BYTES.ZIP_EMPTY) ||
        this.matchesMagic(buffer, MAGIC_BYTES.ZIP_SPANNED))
    ) {
      return "zip";
    }

    // Check for GZIP (2 bytes)
    if (this.matchesMagic(buffer, MAGIC_BYTES.GZIP)) {
      return "gz";
    }

    // Check for BZIP2 (3 bytes: "BZh"). A bare .bz2 is a single compressed
    // file; the caller decides whether the decompressed bytes turn out to be a
    // tar.
    if (this.matchesMagic(buffer, MAGIC_BYTES.BZIP2)) {
      return "bz2";
    }

    // Check for XZ (6 bytes)
    if (buffer.length >= 6 && this.matchesMagic(buffer, MAGIC_BYTES.XZ)) {
      return "xz";
    }

    // Check for Zstandard (4 bytes)
    if (buffer.length >= 4 && this.matchesMagic(buffer, MAGIC_BYTES.ZSTD)) {
      return "zst";
    }

    return null;
  }

  /**
   * Detect archive format from file extension.
   *
   * @param filename - Filename to extract extension from
   * @returns Detected format, or null if extension is unrecognized
   */
  private detectFormatFromExtension(filename: string): ArchiveFormat | null {
    const lowerFilename = filename.toLowerCase();

    if (lowerFilename.endsWith(".tar.gz") || lowerFilename.endsWith(".tgz")) {
      return "tar.gz";
    }
    if (lowerFilename.endsWith(".tar.bz2") || lowerFilename.endsWith(".tbz2")) {
      return "tar.bz2";
    }
    if (lowerFilename.endsWith(".tar")) {
      return "tar";
    }
    if (lowerFilename.endsWith(".gz")) {
      return "gz";
    }
    if (lowerFilename.endsWith(".bz2")) {
      // A bare `.bz2` is a single compressed file, not a tarball. Reporting it
      // as "tar.bz2" sent it down a branch that refused the format outright.
      return "bz2";
    }
    if (lowerFilename.endsWith(".tar.xz") || lowerFilename.endsWith(".txz")) {
      return "xz";
    }
    if (lowerFilename.endsWith(".xz")) {
      return "xz";
    }
    if (lowerFilename.endsWith(".tar.zst") || lowerFilename.endsWith(".tzst")) {
      return "zst";
    }
    if (lowerFilename.endsWith(".zst")) {
      return "zst";
    }
    if (lowerFilename.endsWith(".zip") || lowerFilename.endsWith(".jar")) {
      return "zip";
    }
    if (lowerFilename.endsWith(".rar")) {
      return "rar";
    }
    if (lowerFilename.endsWith(".7z")) {
      return "7z";
    }

    return null;
  }

  /**
   * Check if a buffer starts with the given magic byte sequence.
   *
   * @param buffer - Buffer to check
   * @param magic - Expected byte sequence
   * @returns true if the buffer starts with the magic bytes
   */
  private matchesMagic(buffer: Buffer, magic: readonly number[]): boolean {
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        return false;
      }
    }
    return true;
  }

  // ===========================================================================
  // ENTRY EXTRACTION
  // ===========================================================================

  /**
   * Extract entry metadata from the archive.
   * Delegates to format-specific extraction methods.
   *
   * @param buffer - Raw archive buffer
   * @param format - Detected archive format
   * @returns Extraction result with entries and security warnings, or error
   */
  private async extractEntries(
    buffer: Buffer,
    format: ArchiveFormat,
  ): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    switch (format) {
      case "zip":
        return this.extractZipEntries(buffer);
      case "tar":
        return this.extractTarEntries(buffer);
      case "tar.gz":
        return this.extractTarGzEntries(buffer);
      case "tar.bz2":
      case "bz2":
        return this.extractSingleStreamEntries(buffer, "bz2");
      case "xz":
        return this.extractSingleStreamEntries(buffer, "xz");
      case "zst":
        return this.extractSingleStreamEntries(buffer, "zst");
      case "gz":
        return this.extractGzEntries(buffer);
      default:
        return {
          success: false,
          entries: [],
          securityWarnings: [],
          error: this.createError(FileErrorCode.UNSUPPORTED_TYPE, {
            format,
            reason: `${format} archives are not supported`,
            supportedFormats: "ZIP, TAR, TAR.GZ, TAR.BZ2, GZ, BZ2, XZ, ZST, JAR",
          }),
        };
    }
  }

  // ===========================================================================
  // ZIP EXTRACTION
  // ===========================================================================

  /**
   * Extract entry metadata from a ZIP archive.
   * Validates each entry for path traversal, encryption, symlinks, and size limits.
   *
   * @param buffer - Raw ZIP buffer
   * @returns Extraction result with entries, security warnings, or error
   */
  private async extractZipEntries(buffer: Buffer): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    const entries: ArchiveEntry[] = [];
    const securityWarnings: string[] = [];

    try {
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // Check entry count limit
      if (zipEntries.length > ARCHIVE_SECURITY.MAX_ENTRIES) {
        return {
          success: false,
          entries: [],
          securityWarnings: [],
          error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Archive contains ${zipEntries.length} entries, exceeding the limit of ${ARCHIVE_SECURITY.MAX_ENTRIES}`,
          }),
        };
      }

      let cumulativeUncompressedSize = 0;

      for (const entry of zipEntries) {
        const entryName = entry.entryName;

        // Security: path traversal check
        if (this.hasPathTraversal(entryName)) {
          securityWarnings.push(`Path traversal detected in entry: "${entryName}" - entry skipped`);
          continue;
        }

        // Security: path length check
        if (entryName.length > ARCHIVE_SECURITY.MAX_PATH_LENGTH) {
          securityWarnings.push(
            `Entry name exceeds maximum path length (${ARCHIVE_SECURITY.MAX_PATH_LENGTH}): "${entryName.substring(0, 50)}..." - entry skipped`,
          );
          continue;
        }

        // Security: encrypted entry check
        if (entry.header.flags & 0x01) {
          if (!ARCHIVE_SECURITY.ALLOW_ENCRYPTED) {
            securityWarnings.push(`Encrypted entry detected: "${entryName}" - entry skipped`);
            continue;
          }
        }

        // Security: symlink check (ZIP external attributes)
        const externalAttr = entry.header.attr >>> 16;
        const isSymlink = (externalAttr & 0xa000) === 0xa000;
        if (isSymlink && !ARCHIVE_SECURITY.ALLOW_SYMLINKS) {
          securityWarnings.push(`Symbolic link detected: "${entryName}" - entry skipped`);
          continue;
        }

        const isDirectory = entry.isDirectory;
        const uncompressedSize = entry.header.size;
        const compressedSize = entry.header.compressedSize;

        // Security: single file size check
        if (!isDirectory && uncompressedSize > ARCHIVE_SECURITY.MAX_SINGLE_FILE_SIZE) {
          securityWarnings.push(
            `Entry "${entryName}" exceeds single file size limit (${this.formatSizeMB(uncompressedSize)} MB > ${this.formatSizeMB(ARCHIVE_SECURITY.MAX_SINGLE_FILE_SIZE)} MB) - entry listed but flagged`,
          );
        }

        // Security: per-entry compression ratio check
        if (compressedSize > 0 && !isDirectory) {
          const ratio = uncompressedSize / compressedSize;
          if (ratio > ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO) {
            return {
              success: false,
              entries: [],
              securityWarnings: [],
              error: this.createError(FileErrorCode.ZIP_BOMB_DETECTED, {
                entryName,
                compressionRatio: ratio.toFixed(1),
                maxRatio: ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO,
              }),
            };
          }
        }

        // Cumulative decompressed size check
        cumulativeUncompressedSize += uncompressedSize;
        if (cumulativeUncompressedSize > ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE) {
          return {
            success: false,
            entries: [],
            securityWarnings: [],
            error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
              reason: `Cumulative decompressed size exceeds limit of ${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB`,
            }),
          };
        }

        entries.push({
          name: entryName,
          uncompressedSize,
          compressedSize,
          isDirectory,
        });
      }

      return { success: true, entries, securityWarnings };
    } catch (error) {
      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(
          FileErrorCode.CORRUPTED_FILE,
          {
            reason: `Failed to read ZIP archive: ${error instanceof Error ? error.message : String(error)}`,
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  // ===========================================================================
  // TAR EXTRACTION
  // ===========================================================================

  /**
   * Extract entry metadata from a plain TAR archive.
   *
   * @param buffer - Raw TAR buffer
   * @returns Extraction result with entries and security warnings, or error
   */
  private async extractTarEntries(buffer: Buffer): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    try {
      const tarStream = await import("tar-stream");
      return await this.parseTarStream(tarStream, buffer);
    } catch (error) {
      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(
          FileErrorCode.CORRUPTED_FILE,
          {
            reason: `Failed to read TAR archive: ${error instanceof Error ? error.message : String(error)}`,
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Extract entry metadata from a GZIP-compressed TAR archive.
   * First decompresses with zlib, then parses as TAR.
   *
   * @param buffer - Raw TAR.GZ buffer
   * @returns Extraction result with entries and security warnings, or error
   */
  private async extractTarGzEntries(buffer: Buffer): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    try {
      const zlib = await import("zlib");
      const { promisify } = await import("util");
      const gunzip = promisify(zlib.gunzip);

      // Bounded at the decoder, matching the zstd path. Checking the length
      // afterwards only reports a bomb once it has already been paid for: 40KB
      // of gzip inflates to 40MB, and the allocation is the damage, not the
      // number. `maxOutputLength` abandons the inflate at the cap instead, so
      // the ceiling on memory is the limit rather than whatever the attacker
      // chose. The overflow is classified in the catch below.
      const decompressed = await gunzip(buffer, {
        maxOutputLength: ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE,
      });
      const tarBuffer = Buffer.from(decompressed);

      // Security: check compression ratio
      if (buffer.length > 0) {
        const ratio = tarBuffer.length / buffer.length;
        if (ratio > ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO) {
          return {
            success: false,
            entries: [],
            securityWarnings: [],
            error: this.createError(FileErrorCode.ZIP_BOMB_DETECTED, {
              compressionRatio: ratio.toFixed(1),
              maxRatio: ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO,
            }),
          };
        }
      }

      const tarStream = await import("tar-stream");
      return await this.parseTarStream(tarStream, tarBuffer);
    } catch (error) {
      if (isDecompressionBoundExceeded(error)) {
        return {
          success: false,
          entries: [],
          securityWarnings: [],
          error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Decompressed TAR size exceeds limit (${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB)`,
          }),
        };
      }
      // Check if the error is one we already created (security validation)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
      ) {
        // Re-throw our structured errors
        return {
          success: false,
          entries: [],
          securityWarnings: [],
          error: this.createError(
            FileErrorCode.DECOMPRESSION_FAILED,
            {
              reason: `Failed to decompress TAR.GZ archive: ${error instanceof Error ? error.message : String(error)}`,
            },
            error instanceof Error ? error : undefined,
          ),
        };
      }

      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(
          FileErrorCode.DECOMPRESSION_FAILED,
          {
            reason: `Failed to decompress TAR.GZ archive: ${error instanceof Error ? error.message : String(error)}`,
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Parse a TAR stream and extract entry metadata.
   * Shared between plain TAR and decompressed TAR.GZ processing.
   *
   * @param tarStream - The imported tar-stream module
   * @param buffer - Raw (decompressed) TAR buffer
   * @returns Extraction result with entries and security warnings, or error
   */
  private async parseTarStream(
    tarStream: typeof import("tar-stream"),
    buffer: Buffer,
  ): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    return new Promise((resolve) => {
      const entries: ArchiveEntry[] = [];
      const securityWarnings: string[] = [];
      const contents = new Map<string, string>();
      let entryCount = 0;
      let cumulativeSize = 0;
      let extractedBytes = 0;
      let earlyError: FileProcessingError | null = null;

      const extract = tarStream.extract();

      extract.on("entry", (header, stream, next) => {
        entryCount++;

        // Security: entry count limit
        if (entryCount > ARCHIVE_SECURITY.MAX_ENTRIES) {
          earlyError = this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Archive contains more than ${ARCHIVE_SECURITY.MAX_ENTRIES} entries`,
          });
          stream.resume();
          extract.destroy();
          return;
        }

        const entryName = header.name || "";
        const entrySize = header.size || 0;
        const entryType = header.type || "file";

        // Security: path traversal
        if (this.hasPathTraversal(entryName)) {
          securityWarnings.push(`Path traversal detected in entry: "${entryName}" - entry skipped`);
          stream.resume();
          next();
          return;
        }

        // Security: path length
        if (entryName.length > ARCHIVE_SECURITY.MAX_PATH_LENGTH) {
          securityWarnings.push(
            `Entry name exceeds maximum path length (${ARCHIVE_SECURITY.MAX_PATH_LENGTH}): "${entryName.substring(0, 50)}..." - entry skipped`,
          );
          stream.resume();
          next();
          return;
        }

        // Security: symlinks
        if ((entryType === "symlink" || entryType === "link") && !ARCHIVE_SECURITY.ALLOW_SYMLINKS) {
          securityWarnings.push(`Symbolic/hard link detected: "${entryName}" - entry skipped`);
          stream.resume();
          next();
          return;
        }

        const isDirectory = entryType === "directory";

        // Security: single file size
        if (!isDirectory && entrySize > ARCHIVE_SECURITY.MAX_SINGLE_FILE_SIZE) {
          securityWarnings.push(
            `Entry "${entryName}" exceeds single file size limit (${this.formatSizeMB(entrySize)} MB > ${this.formatSizeMB(ARCHIVE_SECURITY.MAX_SINGLE_FILE_SIZE)} MB) - entry listed but flagged`,
          );
        }

        // Security: cumulative size
        cumulativeSize += entrySize;
        if (cumulativeSize > ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE) {
          earlyError = this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Cumulative entry size exceeds limit of ${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB`,
          });
          stream.resume();
          extract.destroy();
          return;
        }

        entries.push({
          name: entryName,
          uncompressedSize: entrySize,
          compressedSize: 0, // TAR doesn't compress individual entries
          isDirectory,
        });

        // Capture the text of eligible members as they go past.
        //
        // A listing alone is not an answer. Asked what a .tar contains, the
        // model could previously only recite filenames and sizes — the same
        // archive as a .zip returned its text, because only the ZIP path
        // extracted anything. A tar entry's bytes are available exactly once,
        // here, while the stream is open; re-reading later would mean parsing
        // the whole archive a second time.
        if (
          !isDirectory &&
          this.isExtractableEntryName(entryName) &&
          entrySize > 0 &&
          entrySize <= ARCHIVE_CONFIG.MAX_EXTRACT_ENTRY_SIZE &&
          contents.size < ARCHIVE_CONFIG.MAX_EXTRACT_ENTRIES &&
          extractedBytes + entrySize <= ARCHIVE_CONFIG.MAX_TOTAL_EXTRACT_SIZE
        ) {
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            const text = this.decodeEntryText(Buffer.concat(chunks));
            if (text !== null) {
              contents.set(entryName, text);
              extractedBytes += entrySize;
            }
            next();
          });
          stream.on("error", () => next());
          return;
        }

        // Consume the stream without buffering (we only need metadata)
        stream.resume();
        next();
      });

      extract.on("finish", () => {
        if (earlyError) {
          resolve({
            success: false,
            entries: [],
            securityWarnings: [],
            error: earlyError,
          });
        } else {
          resolve({ success: true, entries, securityWarnings, contents });
        }
      });

      extract.on("error", (err: Error) => {
        if (earlyError) {
          resolve({
            success: false,
            entries: [],
            securityWarnings: [],
            error: earlyError,
          });
        } else {
          resolve({
            success: false,
            entries: [],
            securityWarnings: [],
            error: this.createError(
              FileErrorCode.CORRUPTED_FILE,
              {
                reason: `Failed to parse TAR archive: ${err.message}`,
              },
              err,
            ),
          });
        }
      });

      // Feed the buffer into the extract stream
      extract.end(buffer);
    });
  }

  // ===========================================================================
  // GZIP EXTRACTION (plain, non-TAR)
  // ===========================================================================

  /**
   * Extract metadata from a plain GZIP file (single compressed file, not a TAR).
   * Since plain GZ wraps a single file, we create a single entry using the
   * original filename minus the .gz extension.
   *
   * @param buffer - Raw GZIP buffer
   * @returns Extraction result with a single entry and security warnings, or error
   */
  private async extractGzEntries(buffer: Buffer): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    try {
      const zlib = await import("zlib");
      const { promisify } = await import("util");
      const gunzip = promisify(zlib.gunzip);

      // Bounded at the decoder — see the matching call in extractTarGzEntries.
      // The overflow is classified in the catch below.
      const decompressed = await gunzip(buffer, {
        maxOutputLength: ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE,
      });

      // Security: compression ratio
      if (buffer.length > 0) {
        const ratio = decompressed.length / buffer.length;
        if (ratio > ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO) {
          return {
            success: false,
            entries: [],
            securityWarnings: [],
            error: this.createError(FileErrorCode.ZIP_BOMB_DETECTED, {
              compressionRatio: ratio.toFixed(1),
              maxRatio: ARCHIVE_SECURITY.MAX_COMPRESSION_RATIO,
            }),
          };
        }
      }

      // Check if the decompressed content is actually a TAR
      if (this.looksLikeTar(decompressed)) {
        // It's actually a tar.gz; re-route through TAR extraction
        const tarStream = await import("tar-stream");
        return await this.parseTarStream(tarStream, Buffer.from(decompressed));
      }

      // Plain GZ - single entry
      // Derive the inner filename by removing the .gz extension
      const innerFilename = "decompressed-content";

      const securityWarnings: string[] = [];
      const entries: ArchiveEntry[] = [
        {
          name: innerFilename,
          uncompressedSize: decompressed.length,
          compressedSize: buffer.length,
          isDirectory: false,
        },
      ];

      // The decompressed bytes ARE the content here; a listing that says
      // "decompressed-content (1.02 MB)" answers nothing about the file.
      const contents = new Map<string, string>();
      const gzText = this.decodeEntryText(decompressed);
      if (gzText !== null) {
        contents.set(
          innerFilename,
          gzText.slice(0, ARCHIVE_CONFIG.MAX_EXTRACT_ENTRY_SIZE),
        );
      }

      return { success: true, entries, securityWarnings, contents };
    } catch (error) {
      if (isDecompressionBoundExceeded(error)) {
        return {
          success: false,
          entries: [],
          securityWarnings: [],
          error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
            reason: `Decompressed size exceeds limit (${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB)`,
          }),
        };
      }
      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(
          FileErrorCode.DECOMPRESSION_FAILED,
          {
            reason: `Failed to decompress GZIP file: ${error instanceof Error ? error.message : String(error)}`,
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Heuristic check to determine if a buffer looks like a TAR archive.
   * TAR archives have a "ustar" magic string at byte offset 257.
   *
   * @param buffer - Decompressed buffer to check
   * @returns true if the buffer appears to be a TAR archive
   */
  private looksLikeTar(buffer: Buffer | Uint8Array): boolean {
    if (buffer.length < 263) {
      return false;
    }
    // "ustar" at offset 257
    const magic = Buffer.from(buffer.slice(257, 263)).toString("ascii");
    return magic.startsWith("ustar");
  }

  // ===========================================================================
  // SECURITY VALIDATION
  // ===========================================================================

  /**
   * Check if an entry name contains path traversal sequences.
   * Detects `../`, absolute paths, and other traversal vectors.
   *
   * @param entryName - Archive entry name/path to validate
   * @returns true if path traversal is detected
   */
  private hasPathTraversal(entryName: string): boolean {
    // Normalize separators
    const normalized = entryName.replace(/\\/g, "/");

    // Check for parent directory traversal
    if (normalized.includes("../") || normalized.includes("/..")) {
      return true;
    }

    // Check for absolute paths
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
      return true;
    }

    // Check resolved path doesn't escape root
    const resolved = path.posix.normalize(normalized);
    if (resolved.startsWith("../") || resolved === "..") {
      return true;
    }

    return false;
  }

  // ===========================================================================
  // CONTENT EXTRACTION (Phase 2 sub-processing)
  // ===========================================================================

  /**
   * Extract text content from eligible ZIP entries for LLM consumption.
   *
   * Selects small, text-based files from the archive and extracts their
   * content. Files are sorted by relevance (config files, source code, docs).
   * Binary files, nested archives, and files exceeding size limits are skipped.
   *
   * @param buffer - Raw ZIP archive buffer
   * @param entries - Previously extracted entry metadata
   * @returns Map of entry name to extracted text content
   */
  /**
   * Whether an entry name looks like something worth inlining as text.
   *
   * Shared by the ZIP and TAR paths so the two cannot drift into disagreeing
   * about which members are worth reading — they did, because only ZIP had the
   * rule at all.
   */
  private isExtractableEntryName(name: string): boolean {
    const ext = path.extname(name).toLowerCase();
    if (ARCHIVE_CONFIG.EXTRACTABLE_EXTENSIONS.has(ext)) {
      return true;
    }
    const base = path.basename(name).toLowerCase();
    return (
      base === "readme" ||
      base === "license" ||
      base === "makefile" ||
      base === "dockerfile"
    );
  }

  /**
   * Decode bytes to text, or null when they are not text.
   *
   * A NUL byte in the first 512 bytes, or a high proportion of replacement
   * characters after decoding, means binary — inlining that would spend the
   * extraction budget on mojibake.
   */
  private decodeEntryText(data: Buffer): string | null {
    if (!data || data.length === 0) {
      return null;
    }
    if (data.subarray(0, Math.min(512, data.length)).includes(0)) {
      return null;
    }
    const text = data.toString("utf-8");
    const replacements = (text.match(/\ufffd/g) || []).length;
    return replacements > text.length * 0.05 ? null : text;
  }

  /**
   * Decompress a single-stream archive (.bz2, .xz, .zst).
   *
   * Node ships zstd from v22.15/23, so that one needs no help. bzip2 and xz
   * have no Node binding, and adding a native module for them would make an
   * optional format a build-time dependency for every consumer — so the system
   * tools are used when present, the same soft-dependency arrangement this
   * codebase already has with ffmpeg. Absent tooling returns null and the
   * caller reports the format as unsupported *on this machine* rather than
   * unsupported in principle.
   */
  private async decompressSingleStream(
    buffer: Buffer,
    format: "bz2" | "xz" | "zst",
  ): Promise<ArchiveDecompressionResult> {
    if (format === "zst") {
      // Node gained zstd in v22.15/23. Older runtimes simply lack the export,
      // so it is probed at runtime rather than assumed from the typings —
      // which is also why this is a property check on an `unknown` module
      // instead of a cast asserting it exists.
      const zlibModule: unknown = await import("zlib");
      const candidate =
        typeof zlibModule === "object" && zlibModule !== null
          ? (zlibModule as Record<string, unknown>).zstdDecompress
          : undefined;
      if (typeof candidate === "function") {
        const zstdDecompress = candidate as (
          buf: Buffer,
          opts: { maxOutputLength: number },
          cb: (err: Error | null, res: Buffer) => void,
        ) => void;
        return await new Promise<ArchiveDecompressionResult>((resolve) => {
          // Bounded at the decoder rather than after the fact. The size guard
          // downstream only runs once the whole buffer exists, which is too
          // late for a zip-bomb: a few KB of zstd expands to gigabytes and the
          // allocation is what hurts. `maxOutputLength` makes it fail fast.
          zstdDecompress(
            buffer,
            { maxOutputLength: ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE },
            (err, res) =>
              resolve(
                err
                  ? {
                      status:
                        (err as NodeJS.ErrnoException).code ===
                        "ERR_BUFFER_TOO_LARGE"
                          ? "too-large"
                          : "failed",
                    }
                  : { status: "ok", buffer: res },
              ),
          );
        });
      }
    }

    const tool = SINGLE_STREAM_TOOLS[format];
    try {
      const { execFile } = await import("node:child_process");
      return await new Promise<ArchiveDecompressionResult>((resolve) => {
        // ENOENT means the binary is absent; anything else means it ran and
        // could not do the job. Only the former justifies telling the caller to
        // install something.
        //
        // Read off the error itself rather than a flag set by the `error`
        // listener below, because execFile invokes this callback BEFORE that
        // listener runs — measured, not assumed:
        //   callback(missing=false, code=ENOENT) → errorListener(code=ENOENT)
        // The promise is already settled by the time the listener could set the
        // flag, so a missing decompressor reported itself as a corrupt stream
        // and told the user to re-upload a perfectly good file.
        const isMissingTool = (error: unknown): boolean =>
          (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
        // Hitting `maxBuffer` is the zip-bomb guard firing, not a corrupt
        // stream: it will fail identically on every retry, so it must not be
        // reported as retryable the way a truncated upload is.
        const isTooLarge = (error: unknown): boolean =>
          (error as NodeJS.ErrnoException | null)?.code ===
          "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
        const child = execFile(
          tool,
          ["-dc"],
          {
            encoding: "buffer",
            maxBuffer: ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE,
            // Without this a crafted or truncated stream that makes the tool
            // block forever never fires the callback, so the promise never
            // settles and the request that awaits it hangs indefinitely.
            timeout: ARCHIVE_CONFIG.TIMEOUT_MS,
          },
          (error, stdout) => {
            // Only a non-zero exit means failure. Empty output does not:
            // compressing an empty file is legal and round-trips — a 32-byte
            // `empty.txt.xz` decompresses to nothing with exit 0 — so treating
            // zero length as an error reported a valid archive as corrupt. The
            // in-process zstd path above already keyed on the error alone, so
            // the two backends disagreed about the same input.
            if (error || !stdout) {
              resolve({
                status: isMissingTool(error)
                  ? "tool-unavailable"
                  : isTooLarge(error)
                    ? "too-large"
                    : "failed",
              });
              return;
            }
            resolve({ status: "ok", buffer: Buffer.from(stdout) });
          },
        );
        // Kept as a backstop for spawn failures that never reach the
        // callback. Whichever settles first wins; both now classify the same
        // way, so the outcome no longer depends on the order.
        child.on("error", (error: NodeJS.ErrnoException) => {
          resolve({
            status: isMissingTool(error) ? "tool-unavailable" : "failed",
          });
        });
        // Swallowed, deliberately not resolved from. A stdin write fails with
        // EPIPE precisely because the child already died — including when Node
        // killed it for exceeding `maxBuffer`, which is the zip-bomb guard.
        // Resolving here raced the exec callback and, when it won, downgraded a
        // "too-large" verdict to a retryable "failed", telling the caller to
        // retry a bomb. The callback is the authoritative signal: it always
        // fires once the process exits or fails to spawn, and the `timeout`
        // above bounds the wait. This listener exists only so an unhandled
        // 'error' event cannot take the process down.
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(buffer);
      });
    } catch {
      return { status: "tool-unavailable" };
    }
  }

  /**
   * Extract a single-stream archive: decompress, then treat the result as a
   * TAR when it is one and as a lone file otherwise.
   *
   * The tar check matters because `.tar.xz` and `.tar.zst` are how these
   * formats are usually met — reporting one opaque "decompressed-content" blob
   * for an archive of forty files would be technically true and useless.
   */
  private async extractSingleStreamEntries(
    buffer: Buffer,
    format: "bz2" | "xz" | "zst",
  ): Promise<{
    success: boolean;
    entries: ArchiveEntry[];
    securityWarnings: string[];
    contents?: Map<string, string>;
    error?: FileProcessingError;
  }> {
    const result = await this.decompressSingleStream(buffer, format);
    if (result.status !== "ok") {
      const tool = SINGLE_STREAM_TOOLS[format];
      // Three distinct outcomes, and the codes carry contracts a caller acts
      // on. UNSUPPORTED_TYPE is `retryable: false` and advises converting the
      // file; DECOMPRESSION_FAILED is `retryable: true` and advises
      // re-uploading; SECURITY_VALIDATION_FAILED is how the GZIP and TAR.GZ
      // paths in this file already report a decompression bomb. `retryable` is
      // read downstream by `isRetryableErrorCode`, so a stream that tripped the
      // decoder's size cap must not be advertised as worth retrying — it will
      // fail identically every time — and a merely truncated upload must not be
      // reported as an unsupported format.
      const code =
        result.status === "tool-unavailable"
          ? FileErrorCode.UNSUPPORTED_TYPE
          : result.status === "too-large"
            ? FileErrorCode.SECURITY_VALIDATION_FAILED
            : FileErrorCode.DECOMPRESSION_FAILED;
      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(code, {
          format,
          reason:
            result.status === "tool-unavailable"
              ? `${format.toUpperCase()} could not be decompressed. Node has no built-in ` +
                `decoder for it and the "${tool}" command is unavailable on this machine.`
              : result.status === "too-large"
                ? `${format.toUpperCase()} expands beyond the ` +
                  `${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB ` +
                  `decompression limit and was refused before it could be read.`
                : `${format.toUpperCase()} could not be decompressed. The stream is ` +
                  `corrupt or truncated.`,
          supportedFormats: "ZIP, TAR, TAR.GZ, TAR.BZ2, GZ, BZ2, XZ, ZST, JAR",
        }),
      };
    }
    const decompressed = result.buffer;

    if (decompressed.length > ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE) {
      return {
        success: false,
        entries: [],
        securityWarnings: [],
        error: this.createError(FileErrorCode.SECURITY_VALIDATION_FAILED, {
          reason: `Decompressed size (${this.formatSizeMB(decompressed.length)} MB) exceeds limit (${this.formatSizeMB(ARCHIVE_SECURITY.MAX_DECOMPRESSED_SIZE)} MB)`,
        }),
      };
    }

    if (this.looksLikeTar(decompressed)) {
      const tarStream = await import("tar-stream");
      return await this.parseTarStream(tarStream, decompressed);
    }

    const contents = new Map<string, string>();
    const text = this.decodeEntryText(decompressed);
    if (text !== null) {
      contents.set(
        "decompressed-content",
        text.slice(0, ARCHIVE_CONFIG.MAX_EXTRACT_ENTRY_SIZE),
      );
    }
    return {
      success: true,
      entries: [
        {
          name: "decompressed-content",
          uncompressedSize: decompressed.length,
          compressedSize: buffer.length,
          isDirectory: false,
        },
      ],
      securityWarnings: [],
      contents,
    };
  }

  private async extractEntryContents(buffer: Buffer, entries: ArchiveEntry[]): Promise<Map<string, string>> {
    const contents = new Map<string, string>();

    try {
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(buffer);

      // Filter to extractable text-based entries within size limits
      const candidates = entries
        .filter((e) => {
          if (e.isDirectory) {
            return false;
          }
          if (e.uncompressedSize > ARCHIVE_CONFIG.MAX_EXTRACT_ENTRY_SIZE) {
            return false;
          }
          if (e.uncompressedSize === 0) {
            return false;
          }

          return this.isExtractableEntryName(e.name);
        })
        // Sort: smaller files first (more likely to fit), then by name
        .sort((a, b) => a.uncompressedSize - b.uncompressedSize);

      let totalExtracted = 0;
      let extractCount = 0;

      for (const entry of candidates) {
        if (extractCount >= ARCHIVE_CONFIG.MAX_EXTRACT_ENTRIES) {
          break;
        }
        if (totalExtracted + entry.uncompressedSize > ARCHIVE_CONFIG.MAX_TOTAL_EXTRACT_SIZE) {
          break;
        }

        try {
          const zipEntry = zip.getEntry(entry.name);
          if (!zipEntry) {
            continue;
          }

          const data = zipEntry.getData();
          if (!data || data.length === 0) {
            continue;
          }

          // Simple binary detection: check for null bytes in first 512 bytes
          const sample = data.slice(0, Math.min(512, data.length));
          if (sample.includes(0)) {
            continue;
          }

          const text = data.toString("utf-8");
          // Sanity check: skip if too many replacement characters (likely binary)
          const replacementCount = (text.match(/\ufffd/g) || []).length;
          if (replacementCount > text.length * 0.05) {
            continue;
          }

          contents.set(entry.name, text);
          totalExtracted += data.length;
          extractCount++;
        } catch {
          // Skip entries that fail to extract (binary, corrupt, etc.)
        }
      }
    } catch {
      // If ZIP re-parsing fails, return empty — listing is still available
    }

    return contents;
  }

  // ===========================================================================
  // TEXT CONTENT BUILDING
  // ===========================================================================

  /**
   * Build a structured text description of the archive for LLM consumption.
   * Includes archive metadata, file listing with sizes, and security warnings.
   *
   * @param filename - Original archive filename
   * @param metadata - Aggregate archive metadata
   * @param entries - Individual entry metadata
   * @param securityWarnings - Security warnings encountered during processing
   * @param extractedContents - Map of entry name to extracted text content (Phase 2)
   * @returns Formatted text content string
   */
  private buildTextContent(
    filename: string,
    metadata: ProcessedArchive["archiveMetadata"],
    entries: ArchiveEntry[],
    securityWarnings: string[],
    extractedContents?: Map<string, string>,
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(`## Archive: ${filename}`);
    lines.push("");

    // Metadata
    lines.push("### Metadata");
    lines.push(`- **Format:** ${metadata.format.toUpperCase()}`);
    lines.push(`- **Total entries:** ${metadata.totalEntries}`);
    lines.push(`- **Total uncompressed size:** ${this.formatHumanReadableSize(metadata.totalUncompressedSize)}`);
    if (metadata.totalCompressedSize > 0) {
      lines.push(`- **Total compressed size:** ${this.formatHumanReadableSize(metadata.totalCompressedSize)}`);
    }
    lines.push("");

    // Security warnings
    if (securityWarnings.length > 0) {
      lines.push("### Security Warnings");
      for (const warning of securityWarnings) {
        lines.push(`- ${warning}`);
      }
      lines.push("");
    }

    // File listing
    lines.push("### Contents");
    lines.push("");

    // Separate directories and files
    const directories = entries.filter((e) => e.isDirectory);
    const files = entries.filter((e) => !e.isDirectory);

    if (directories.length > 0) {
      lines.push(`**Directories (${directories.length}):**`);
      for (const dir of directories) {
        lines.push(`  ${dir.name}`);
      }
      lines.push("");
    }

    if (files.length > 0) {
      lines.push(`**Files (${files.length}):**`);

      // Sort files by path for readability
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

      for (const file of sortedFiles) {
        const sizeStr = this.formatHumanReadableSize(file.uncompressedSize);
        lines.push(`  ${file.name} (${sizeStr})`);
      }
      lines.push("");
    }

    if (entries.length === 0) {
      lines.push("*Archive is empty.*");
      lines.push("");
    }

    // Extracted file contents (Phase 2 sub-processing)
    if (extractedContents && extractedContents.size > 0) {
      lines.push("### Extracted File Contents");
      lines.push("");
      extractedContents.forEach((content, entryName) => {
        const ext = path.extname(entryName).replace(".", "");
        const langHint = ext || "";
        lines.push(`#### ${entryName}`);
        lines.push(`\`\`\`${langHint}`);
        // Truncate very long file contents to avoid excessive token usage
        if (content.length > 10000) {
          lines.push(content.slice(0, 8000));
          lines.push(`\n... [truncated ${content.length - 8000} characters] ...`);
          lines.push(content.slice(-1000));
        } else {
          lines.push(content);
        }
        lines.push("```");
        lines.push("");
      });
    }

    return lines.join("\n");
  }

  /**
   * Format a byte count as a human-readable size string.
   *
   * @param bytes - Size in bytes
   * @returns Formatted string (e.g., "1.5 MB", "256 KB", "128 B")
   */
  private formatHumanReadableSize(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, units.length - 1);
    return `${parseFloat((bytes / k ** idx).toFixed(2))} ${units[idx]}`;
  }

  // ===========================================================================
  // TARGETED EXTRACTION API
  // ===========================================================================

  /**
   * Extract a specific file from a ZIP archive and return its text content.
   *
   * Called by the `extract_file_content` tool for targeted access to files
   * inside archives. Only supports ZIP archives (the most common format).
   * Applies security checks (path traversal, size limits).
   *
   * @param buffer - Archive file buffer
   * @param entryPath - Path of the entry within the archive (e.g., "src/index.ts")
   * @returns Text content of the extracted file, or error message
   */
  async extractEntry(buffer: Buffer, entryPath: string): Promise<string> {
    try {
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Security: check for path traversal
      if (this.hasPathTraversal(entryPath)) {
        return `Security error: entry path "${entryPath}" contains path traversal.`;
      }

      // Find the matching entry (case-insensitive fallback)
      let targetEntry = entries.find((e) => e.entryName === entryPath);
      if (!targetEntry) {
        targetEntry = entries.find((e) => e.entryName.toLowerCase() === entryPath.toLowerCase());
      }

      if (!targetEntry) {
        // List available entries to help the LLM
        const available = entries
          .filter((e) => !e.isDirectory)
          .slice(0, 20)
          .map((e) => `  - ${e.entryName} (${this.formatHumanReadableSize(e.header.size)})`)
          .join("\n");
        return `Entry "${entryPath}" not found in archive.\n\nAvailable entries (first 20):\n${available}`;
      }

      if (targetEntry.isDirectory) {
        return `"${entryPath}" is a directory, not a file.`;
      }

      // Security: size check
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (targetEntry.header.size > maxSize) {
        return `Entry "${entryPath}" is too large (${this.formatHumanReadableSize(targetEntry.header.size)}). Maximum extraction size is 5 MB.`;
      }

      const data = targetEntry.getData();
      // Check if it looks like text
      const sampleSize = Math.min(data.length, 512);
      let printable = 0;
      for (let i = 0; i < sampleSize; i++) {
        const b = data[i];
        if ((b >= 0x20 && b <= 0x7e) || b === 0x09 || b === 0x0a || b === 0x0d || b >= 0x80) {
          printable++;
        }
      }

      if (sampleSize > 0 && printable / sampleSize < 0.8) {
        return `Entry "${entryPath}" appears to be a binary file (${this.formatHumanReadableSize(data.length)}). Cannot display as text.`;
      }

      return data.toString("utf-8");
    } catch (err) {
      return `Failed to extract entry "${entryPath}": ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Archive processor instance.
 * Use this for standard archive processing operations.
 *
 * @example
 * ```typescript
 * import { archiveProcessor } from "./ArchiveProcessor.js";
 *
 * const result = await archiveProcessor.processFile(fileInfo);
 * ```
 */
export const archiveProcessor = new ArchiveProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an archive file.
 * Matches by MIME type or file extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a recognized archive format
 *
 * @example
 * ```typescript
 * if (isArchiveFile("application/zip", "backup.zip")) {
 *   // Process as archive
 * }
 *
 * if (isArchiveFile("", "data.tar.gz")) {
 *   // Also matches by extension
 * }
 * ```
 */
export function isArchiveFile(mimetype: string, filename: string): boolean {
  return archiveProcessor.isFileSupported(mimetype, filename);
}

/**
 * Process a single archive file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, etc.)
 * @returns Processing result with archive metadata and entry listing, or error
 *
 * @example
 * ```typescript
 * import { processArchive } from "./ArchiveProcessor.js";
 *
 * const result = await processArchive(fileInfo, {
 *   authHeaders: { Authorization: "Bearer token" },
 * });
 *
 * if (result.success) {
 *   const { archiveMetadata, entries, textContent } = result.data;
 *   console.log(`Found ${entries.length} entries in ${archiveMetadata.format} archive`);
 *   console.log(textContent);
 * } else {
 *   console.error(`Processing failed: ${result.error?.userMessage}`);
 * }
 * ```
 */
export async function processArchive(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<ProcessorFileProcessingResult<ProcessedArchive>> {
  return archiveProcessor.processFile(fileInfo, options);
}
