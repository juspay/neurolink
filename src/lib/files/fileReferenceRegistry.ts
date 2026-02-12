/**
 * File Reference Registry
 *
 * Central registry for managing file references in on-demand processing mode.
 * Files are registered with lightweight metadata and previews. Full content
 * is processed on-demand when the LLM requests it via tools.
 *
 * This module is the core of the file reference architecture, replacing
 * the previous "load everything upfront" pattern for files that exceed
 * the tiny/small size tiers.
 *
 * @module files/fileReferenceRegistry
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { estimatePostProcessingTokens } from "../context/fileTokenBudget.js";
import type { FileSource, FileType } from "../types/fileTypes.js";
import { logger } from "../utils/logger.js";
import { StreamingReader } from "./streamingReader.js";
import type {
  FileExtractionParams,
  FileExtractionResult,
  FileReadResult,
  FileReference,
  FileRegistrationOptions,
  FileRegistryOptions,
  FileSearchResult,
  SizeTier,
} from "./types.js";
import { SIZE_TIER_THRESHOLDS } from "./types.js";

/** Default maximum files in registry before LRU eviction */
const DEFAULT_MAX_FILES = 100;

/** Default maximum temp bytes (1 GB) */
const DEFAULT_MAX_TEMP_BYTES = 1024 * 1024 * 1024;

/** Default preview length in characters */
const DEFAULT_PREVIEW_CHARS = 2000;

/** Maximum file size we'll accept (2 GB) */
const MAX_ACCEPTED_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Registry for managing file references with on-demand processing.
 *
 * Design decisions:
 * - One instance per NeuroLink SDK instance (not global singleton)
 * - File buffers persisted to temp dir for later streaming access
 * - LRU eviction when maxFiles exceeded
 * - Thread-safe via sequential async operations (Node.js single-threaded)
 *
 * @example
 * ```typescript
 * const registry = new FileReferenceRegistry();
 * const ref = await registry.register(buffer, {
 *   filename: 'report.xlsx',
 * });
 * console.log(ref.sizeTier);      // 'medium'
 * console.log(ref.preview);       // First 2000 chars of processed content
 * console.log(ref.estimatedTokens); // Type-aware estimate
 *
 * // Later, LLM requests specific section
 * const section = await registry.readSection(ref.id, 1, 50, 5000);
 * ```
 */
export class FileReferenceRegistry {
  private files: Map<string, FileReference> = new Map();
  private tempDir: string;
  private maxFiles: number;
  private maxTempBytes: number;
  private defaultPreviewChars: number;
  private currentTempBytes: number = 0;
  private tempDirCreated: boolean = false;

  constructor(options: FileRegistryOptions = {}) {
    this.tempDir =
      options.tempDir || join(tmpdir(), "neurolink-files", randomUUID());
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    this.maxTempBytes = options.maxTempBytes ?? DEFAULT_MAX_TEMP_BYTES;
    this.defaultPreviewChars =
      options.defaultPreviewChars ?? DEFAULT_PREVIEW_CHARS;
  }

  /**
   * Register a file from a Buffer.
   *
   * This is the primary registration method. It performs lightweight analysis:
   * 1. Detect file type from magic bytes (first 1KB)
   * 2. Determine size tier
   * 3. Extract preview (first N chars of text, or metadata for binary)
   * 4. Persist buffer to temp directory for later streaming access
   *
   * Total time: ~1-5ms for most files (no full processing).
   *
   * @param buffer - File content as Buffer
   * @param source - How the file was provided ('buffer', 'url', 'path', 'datauri')
   * @param options - Registration options
   * @returns FileReference with metadata and preview
   */
  async register(
    buffer: Buffer,
    source: FileSource = "buffer",
    options: FileRegistrationOptions = {},
  ): Promise<FileReference> {
    const sizeBytes = buffer.length;

    // Reject oversized files
    if (sizeBytes > MAX_ACCEPTED_SIZE) {
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      throw new Error(
        `File too large (${sizeMB} MB). Maximum accepted size is 2 GB.`,
      );
    }

    // Detect file type from magic bytes and extension.
    // If the provided filename has no extension, append one guessed from magic bytes
    // so downstream processors (e.g., VideoProcessor) can validate by extension.
    let filename =
      options.filename || `file-${Date.now()}${this.guessExtension(buffer)}`;
    if (!extname(filename)) {
      const guessedExt = this.guessExtension(buffer);
      if (guessedExt) {
        filename = `${filename}${guessedExt}`;
      }
    }
    const ext = extname(filename).toLowerCase().replace(".", "");
    const detectedType = options.fileType || this.detectType(buffer, ext);
    const mimeType = this.guessMimeType(detectedType, ext);
    const sizeTier = FileReferenceRegistry.classifySizeTier(sizeBytes);

    // Generate preview (fast — only reads first N chars)
    const preview = this.extractPreview(
      buffer,
      detectedType,
      options.maxPreviewChars ?? this.defaultPreviewChars,
    );

    // Estimate post-processing tokens (type-aware)
    const estimatedTokens = estimatePostProcessingTokens(
      sizeBytes,
      detectedType,
    );

    // Create reference
    const ref: FileReference = {
      id: randomUUID(),
      source,
      filename,
      sizeBytes,
      detectedType,
      mimeType,
      sizeTier,
      estimatedTokens,
      preview,
      status: "registered",
      registeredAt: Date.now(),
      lastAccessedAt: Date.now(),
      extension: ext || undefined,
    };

    // Persist buffer to temp directory (unless skipped or tiny)
    if (!options.skipTempPersist && sizeTier !== "tiny") {
      try {
        const tempPath = await this.persistToTemp(ref.id, buffer, ext);
        ref.tempPath = tempPath;
      } catch (err) {
        logger.warn(
          `[FileReferenceRegistry] Failed to persist ${filename} to temp: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        // Continue without temp persistence — buffer-based access still works
      }
    }

    // For tiny files, store the processed content inline
    if (sizeTier === "tiny") {
      ref.processedContent = this.isTextType(detectedType, buffer)
        ? buffer.toString("utf-8")
        : preview;
      ref.status = "processed";
    } else {
      ref.status = "previewed";
    }

    // Evict LRU entries if at capacity
    if (this.files.size >= this.maxFiles) {
      this.evictLRU();
    }

    this.files.set(ref.id, ref);

    logger.info(
      `[FileReferenceRegistry] Registered "${filename}" (${this.formatSize(sizeBytes)}, ` +
        `tier=${sizeTier}, type=${detectedType}, ~${estimatedTokens} tokens)`,
    );

    return ref;
  }

  /**
   * Register a file from a file path on disk.
   *
   * Does NOT read the entire file — only reads the first 1KB for type detection
   * and preview. The file path is stored for later streaming access.
   *
   * @param filePath - Absolute path to the file
   * @param options - Registration options
   * @returns FileReference with metadata and preview
   */
  async registerFromPath(
    filePath: string,
    options: FileRegistrationOptions = {},
  ): Promise<FileReference> {
    const fileStat = await stat(filePath);
    const sizeBytes = fileStat.size;

    if (sizeBytes > MAX_ACCEPTED_SIZE) {
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      throw new Error(
        `File too large (${sizeMB} MB). Maximum accepted size is 2 GB.`,
      );
    }

    const filename = options.filename || basename(filePath);
    const ext = extname(filename).toLowerCase().replace(".", "");
    const detectedType = options.fileType || this.detectTypeFromExtension(ext);
    const mimeType = this.guessMimeType(detectedType, ext);
    const sizeTier = FileReferenceRegistry.classifySizeTier(sizeBytes);
    const estimatedTokens = estimatePostProcessingTokens(
      sizeBytes,
      detectedType,
    );

    // Read preview from file (streaming — only first N bytes)
    let preview: string;
    try {
      preview = await StreamingReader.readPreview(
        filePath,
        options.maxPreviewChars ?? this.defaultPreviewChars,
      );
    } catch {
      preview = `[File: ${filename}, ${this.formatSize(sizeBytes)}, type: ${detectedType}]`;
    }

    const ref: FileReference = {
      id: randomUUID(),
      source: "path",
      originalPath: filePath,
      filename,
      sizeBytes,
      detectedType,
      mimeType,
      sizeTier,
      estimatedTokens,
      preview,
      status: "previewed",
      registeredAt: Date.now(),
      lastAccessedAt: Date.now(),
      extension: ext || undefined,
    };

    // For path-based files, no need to persist — we already have the path
    // Store the original path as the access point
    ref.tempPath = filePath;

    if (this.files.size >= this.maxFiles) {
      this.evictLRU();
    }

    this.files.set(ref.id, ref);

    logger.info(
      `[FileReferenceRegistry] Registered from path "${filename}" ` +
        `(${this.formatSize(sizeBytes)}, tier=${sizeTier}, type=${detectedType})`,
    );

    return ref;
  }

  /**
   * Get a file reference by ID.
   * Updates lastAccessedAt for LRU tracking.
   */
  get(id: string): FileReference | undefined {
    const ref = this.files.get(id);
    if (ref) {
      ref.lastAccessedAt = Date.now();
    }
    return ref;
  }

  /**
   * Get a file reference by ID or filename.
   * Tries ID lookup first, then falls back to filename match.
   * This handles the common case where an LLM uses the filename
   * instead of the UUID when calling file tools.
   *
   * @param idOrName - UUID or filename to search for
   * @returns File reference if found, undefined otherwise
   */
  getByIdOrFilename(idOrName: string): FileReference | undefined {
    // Try direct ID lookup first (most common, O(1))
    const byId = this.get(idOrName);
    if (byId) {
      return byId;
    }

    // Fallback: search by filename (case-insensitive)
    const lowerName = idOrName.toLowerCase();
    for (const ref of this.files.values()) {
      if (ref.filename.toLowerCase() === lowerName) {
        ref.lastAccessedAt = Date.now();
        return ref;
      }
    }

    // Fallback: search by basename (without path)
    for (const ref of this.files.values()) {
      const refBasename = ref.filename.split("/").pop()?.toLowerCase() ?? "";
      if (refBasename === lowerName) {
        ref.lastAccessedAt = Date.now();
        return ref;
      }
    }

    return undefined;
  }

  /**
   * Ensure a file has been processed (binary content extracted to text).
   *
   * For text files this is a no-op. For binary files (PDF, XLSX, video, etc.)
   * this triggers on-demand processing if it hasn't happened yet. After this
   * call, ref.processedContent and ref.preview contain extracted text.
   *
   * Used by file tools (get_file_preview) to ensure the preview contains
   * real content instead of placeholder metadata strings.
   */
  async ensureProcessed(fileId: string): Promise<void> {
    const ref = this.get(fileId);
    if (!ref) {
      return;
    }
    if (!ref.processedContent && !this.isTextType(ref.detectedType)) {
      await this.processFileOnDemand(ref);
    }
  }

  /**
   * Extract targeted content from a registered file.
   *
   * This is the core dispatch method for the `extract_file_content` tool.
   * Routes extraction to the appropriate processor based on file type and
   * the parameters provided.
   *
   * @param params - Extraction parameters (file_id + type-specific options)
   * @returns Extraction result with text and/or images
   */
  async extractContent(
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    const ref = this.getByIdOrFilename(params.file_id);
    if (!ref) {
      return {
        success: false,
        error: `File not found: "${params.file_id}". Use list_attached_files to see available files.`,
      };
    }

    try {
      // Text-like types don't need raw buffer — they use readSection
      // which works from processedContent (tiny files) or tempPath (larger files)
      if (
        this.isTextType(ref.detectedType) ||
        ref.detectedType === "csv" ||
        ref.detectedType === "svg" ||
        ref.detectedType === "unknown"
      ) {
        return await this.extractTextTargeted(ref, params);
      }

      // Binary types need the raw buffer for processor-specific extraction
      const buffer = ref.tempPath ? await readFile(ref.tempPath) : null;
      if (!buffer) {
        return {
          success: false,
          error: `No file data available for "${ref.filename}". The file may have been evicted from cache.`,
        };
      }

      switch (ref.detectedType) {
        case "video":
          return await this.extractVideoTargeted(buffer, ref, params);
        case "pdf":
          return await this.extractPdfTargeted(buffer, ref, params);
        case "xlsx":
          return await this.extractExcelTargeted(buffer, ref, params);
        case "pptx":
          return await this.extractPptxTargeted(buffer, ref, params);
        case "archive":
          return await this.extractArchiveTargeted(buffer, ref, params);
        case "audio":
          return await this.extractAudioTargeted(buffer, ref, params);
        default:
          // Fallback for any unrecognized binary type
          return await this.extractTextTargeted(ref, params);
      }
    } catch (err) {
      return {
        success: false,
        error: `Extraction failed for "${ref.filename}": ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ─── Targeted Extraction Dispatchers ──────────────────────────────

  private async extractVideoTargeted(
    buffer: Buffer,
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    const { videoProcessor } = await import(
      "../processors/media/VideoProcessor.js"
    );

    // If time range specified, extract frames from that range
    if (params.start_time !== undefined && params.end_time !== undefined) {
      const frames = await videoProcessor.extractFrameRange(
        buffer,
        ref.filename,
        params.start_time,
        params.end_time,
        params.frame_count ?? 5,
      );

      return {
        success: true,
        text: `Extracted ${frames.length} frames from ${ref.filename} (${params.start_time}s - ${params.end_time}s)`,
        images: frames,
        metadata: {
          startTime: params.start_time,
          endTime: params.end_time,
          frameCount: frames.length,
        },
      };
    }

    // No time range: return full metadata + initial keyframes
    if (!ref.processedContent) {
      await this.processFileOnDemand(ref);
    }
    return {
      success: true,
      text: ref.processedContent || `[Video: ${ref.filename}]`,
      images: ref.extractedImages ?? undefined,
    };
  }

  private async extractPdfTargeted(
    buffer: Buffer,
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    // If specific pages requested, extract those pages
    const pages =
      params.pages ??
      (params.page_range
        ? Array.from(
            { length: params.page_range.end - params.page_range.start + 1 },
            (_, i) => (params.page_range ?? { start: 0 }).start + i,
          )
        : undefined);

    if (pages && pages.length > 0) {
      try {
        const { PDFParse } = await import("pdf-parse");
        const pdf = new PDFParse({ data: new Uint8Array(buffer) });
        try {
          const firstPage = Math.min(...pages);
          const lastPage = Math.max(...pages);
          const textResult = await pdf.getText({
            first: firstPage,
            last: lastPage,
          });
          const totalPages = textResult.total || 0;
          const text =
            textResult.text?.trim() || "(No text found on the requested pages)";

          // Note: pdf-parse extracts a contiguous range (first..last).
          // For non-contiguous page requests (e.g., [1, 5, 12]), the result
          // includes all pages in the range. This is a limitation of pdf-parse.
          const rangeNote =
            firstPage !== lastPage
              ? ` (extracted pages ${firstPage}-${lastPage})`
              : "";

          return {
            success: true,
            text:
              `## Pages ${pages.join(", ")} of ${ref.filename}${rangeNote}\n` +
              `Total pages in document: ${totalPages}\n\n${text}`,
            metadata: {
              requestedPages: pages,
              extractedRange: { first: firstPage, last: lastPage },
              totalPages,
            },
          };
        } finally {
          await pdf.destroy().catch(() => {
            /* cleanup - ignore destroy errors */
          });
        }
      } catch (err) {
        return {
          success: false,
          error: `PDF page extraction failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // No specific pages: return full content
    if (!ref.processedContent) {
      await this.processFileOnDemand(ref);
    }
    return {
      success: true,
      text: ref.processedContent || `[PDF: ${ref.filename}]`,
    };
  }

  private async extractExcelTargeted(
    buffer: Buffer,
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    const { excelProcessor } = await import(
      "../processors/document/ExcelProcessor.js"
    );

    const text = await excelProcessor.extractSheetRange(
      buffer,
      params.sheet,
      params.row_range?.start ?? 1,
      params.row_range?.end,
      params.columns,
    );

    return {
      success: true,
      text,
      metadata: {
        sheet: params.sheet,
        rowRange: params.row_range,
        columns: params.columns,
      },
    };
  }

  private async extractPptxTargeted(
    buffer: Buffer,
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    const pages =
      params.pages ??
      (params.page_range
        ? Array.from(
            { length: params.page_range.end - params.page_range.start + 1 },
            (_, i) => (params.page_range ?? { start: 0 }).start + i,
          )
        : undefined);

    if (pages && pages.length > 0) {
      const { PptxProcessor } = await import(
        "../processors/document/PptxProcessor.js"
      );
      const text = await PptxProcessor.extractSlides(buffer, pages);
      return {
        success: true,
        text,
        metadata: { slides: pages },
      };
    }

    // Full extraction
    if (!ref.processedContent) {
      await this.processFileOnDemand(ref);
    }
    return {
      success: true,
      text: ref.processedContent || `[PPTX: ${ref.filename}]`,
    };
  }

  private async extractArchiveTargeted(
    buffer: Buffer,
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    if (params.entry_path) {
      const { archiveProcessor } = await import(
        "../processors/archive/ArchiveProcessor.js"
      );
      const text = await archiveProcessor.extractEntry(
        buffer,
        params.entry_path,
      );
      return {
        success: true,
        text,
        metadata: { entryPath: params.entry_path },
      };
    }

    // No specific entry: return full listing
    if (!ref.processedContent) {
      await this.processFileOnDemand(ref);
    }
    return {
      success: true,
      text: ref.processedContent || `[Archive: ${ref.filename}]`,
    };
  }

  private async extractAudioTargeted(
    _buffer: Buffer,
    ref: FileReference,
    _params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    // Audio doesn't have sub-section extraction yet — return full metadata
    if (!ref.processedContent) {
      await this.processFileOnDemand(ref);
    }
    return {
      success: true,
      text: ref.processedContent || `[Audio: ${ref.filename}]`,
    };
  }

  private async extractTextTargeted(
    ref: FileReference,
    params: FileExtractionParams,
  ): Promise<FileExtractionResult> {
    // For text files, use line-range reading
    const startLine = params.page_range?.start ?? params.row_range?.start ?? 1;
    const endLine = params.page_range?.end ?? params.row_range?.end;
    const result = await this.readSection(ref.id, startLine, endLine, 50_000);
    return {
      success: true,
      text: result.content,
      metadata: {
        startLine: result.startLine,
        endLine: result.endLine,
        totalLines: result.totalLines,
        truncated: result.truncated,
      },
    };
  }

  /**
   * List all registered files.
   * Returns a lightweight summary suitable for the LLM.
   */
  list(): FileReference[] {
    return Array.from(this.files.values());
  }

  /**
   * Generate a formatted table of all registered files for the LLM.
   */
  listFormatted(): string {
    const files = this.list();
    if (files.length === 0) {
      return "No files attached.";
    }

    const header =
      "| # | Filename | Type | Size | Tier | Est. Tokens | Status |\n" +
      "|---|----------|------|------|------|-------------|--------|\n";

    const rows = files.map(
      (f, i) =>
        `| ${i + 1} | ${f.filename} | ${f.detectedType} | ${this.formatSize(f.sizeBytes)} | ` +
        `${f.sizeTier} | ~${f.estimatedTokens.toLocaleString()} | ${f.status} |`,
    );

    return header + rows.join("\n");
  }

  /**
   * Read a section of a registered file.
   *
   * Uses StreamingReader for memory-efficient access.
   *
   * @param fileId - File reference ID
   * @param startLine - Starting line (1-indexed)
   * @param endLine - Ending line (1-indexed)
   * @param tokenBudget - Maximum tokens to return
   * @param provider - Provider name for token estimation
   * @returns FileReadResult
   */
  async readSection(
    fileId: string,
    startLine: number = 1,
    endLine?: number,
    tokenBudget: number = 50_000,
    provider?: string,
  ): Promise<FileReadResult> {
    const ref = this.get(fileId);
    if (!ref) {
      throw new Error(`File reference not found: ${fileId}`);
    }

    // Process binary files on first read — the lazy registration path
    // stores raw binary to temp but never runs processors. We must process
    // on-demand so the LLM gets extracted text, not garbled binary.
    if (!ref.processedContent && !this.isTextType(ref.detectedType)) {
      await this.processFileOnDemand(ref);
    }

    // If content is already cached (or was just processed), use buffer reader
    if (ref.processedContent) {
      return StreamingReader.readFromBuffer(
        Buffer.from(ref.processedContent, "utf-8"),
        {
          startLine,
          endLine,
          tokenBudget,
          provider,
        },
      );
    }

    // If we have a temp path or original path, use streaming reader
    // (text files that were not processed on-demand)
    const filePath = ref.tempPath || ref.originalPath;
    if (filePath) {
      const result = await StreamingReader.readLines(filePath, {
        startLine,
        endLine,
        tokenBudget,
        provider,
      });

      // Cache total lines for future reference
      if (!ref.totalLines) {
        ref.totalLines = result.totalLines;
      }

      return result;
    }

    throw new Error(
      `No accessible content for file "${ref.filename}" (id: ${fileId})`,
    );
  }

  /**
   * Search within a registered file.
   *
   * @param fileId - File reference ID
   * @param pattern - Search pattern (string or regex)
   * @param maxMatches - Maximum matches to return
   * @returns FileSearchResult
   */
  async search(
    fileId: string,
    pattern: string,
    maxMatches: number = 50,
  ): Promise<FileSearchResult> {
    const ref = this.get(fileId);
    if (!ref) {
      throw new Error(`File reference not found: ${fileId}`);
    }

    // Process binary files on first search — same lazy processing as readSection().
    // Without this, search would scan raw PDF/XLSX binary bytes for text patterns.
    if (!ref.processedContent && !this.isTextType(ref.detectedType)) {
      await this.processFileOnDemand(ref);
    }

    // Search in processedContent if available (binary files after on-demand processing, or tiny files)
    if (ref.processedContent) {
      return FileReferenceRegistry.searchInMemory(
        ref.processedContent,
        pattern,
        maxMatches,
      );
    }

    // For text files: use streaming search on the raw temp file (content IS valid UTF-8)
    const filePath = ref.tempPath || ref.originalPath;
    if (filePath) {
      return StreamingReader.searchInFile(filePath, pattern, {
        maxMatches,
      });
    }

    throw new Error(
      `No searchable content for file "${ref.filename}" (id: ${fileId})`,
    );
  }

  /**
   * Search within in-memory content (for tiny files without temp paths).
   */
  private static searchInMemory(
    content: string,
    pattern: string,
    maxMatches: number,
  ): FileSearchResult {
    const regex = new RegExp(
      pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    const lines = content.split("\n");
    const matches: Array<{
      lineNumber: number;
      line: string;
      contextBefore: string[];
      contextAfter: string[];
    }> = [];
    let totalMatches = 0;

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        totalMatches++;
        if (matches.length < maxMatches) {
          matches.push({
            lineNumber: i + 1,
            line: lines[i],
            contextBefore: lines.slice(Math.max(0, i - 3), i),
            contextAfter: lines.slice(i + 1, Math.min(lines.length, i + 4)),
          });
        }
      }
    }

    return {
      matches,
      totalMatches,
      truncated: totalMatches > maxMatches,
    };
  }

  /**
   * Store a summary for a file reference.
   */
  setSummary(fileId: string, summary: string): void {
    const ref = this.files.get(fileId);
    if (ref) {
      ref.summary = summary;
      ref.status = "processed";
      ref.lastAccessedAt = Date.now();
    }
  }

  /**
   * Remove a file reference and clean up its temp file.
   */
  async remove(fileId: string): Promise<boolean> {
    const ref = this.files.get(fileId);
    if (!ref) {
      return false;
    }

    // Clean up temp file (only if we created it, not for original paths)
    if (ref.tempPath && ref.source !== "path") {
      try {
        await unlink(ref.tempPath);
        this.currentTempBytes -= ref.sizeBytes;
      } catch {
        // Temp file may already be cleaned up
      }
    }

    this.files.delete(fileId);
    return true;
  }

  /**
   * Clear all file references and clean up temp directory.
   */
  async clear(): Promise<void> {
    const ids = Array.from(this.files.keys());
    for (const id of ids) {
      await this.remove(id);
    }
    this.files.clear();
    this.currentTempBytes = 0;
  }

  /**
   * Get the number of registered files.
   */
  get size(): number {
    return this.files.size;
  }

  /**
   * Generate the preview text for the initial prompt.
   *
   * Returns a compact summary of all registered files that uses ~50-100 tokens
   * per file instead of full content. The LLM can use file tools to access
   * more content as needed.
   *
   * @returns Formatted string for prompt injection
   */
  async generatePromptPreview(): Promise<string> {
    const files = this.list();
    if (files.length === 0) {
      return "";
    }

    // Ensure binary files are processed so previews contain real content
    // (e.g., video metadata, audio tags) instead of placeholder strings.
    for (const ref of files) {
      if (!ref.processedContent && !this.isTextType(ref.detectedType)) {
        await this.processFileOnDemand(ref);
      }
    }

    const sections: string[] = [];
    sections.push(`\n\n## Attached Files (${files.length})\n`);

    for (const ref of files) {
      const sizeStr = this.formatSize(ref.sizeBytes);
      sections.push(
        `### File: "${ref.filename}" (${sizeStr}, ${ref.detectedType})`,
      );

      if (ref.sizeTier === "tiny" && ref.processedContent) {
        // Tiny files: include full content inline
        sections.push(ref.processedContent);
      } else {
        // Larger files: include preview + guidance
        sections.push(`**Preview** (first ${this.defaultPreviewChars} chars):`);
        sections.push(ref.preview);

        // Add type-specific extraction hints
        const hint = FileReferenceRegistry.getExtractionHint(
          ref.detectedType,
          sizeStr,
        );
        if (hint) {
          sections.push(`\n> ${hint}`);
        } else if (ref.sizeTier !== "small") {
          sections.push(
            `\n> This file is ${sizeStr}. Use \`read_file_section\` to read specific ` +
              `sections, \`search_in_file\` to search, or \`summarize_file\` for a full summary.`,
          );
        }
      }
      sections.push(""); // blank line between files
    }

    return sections.join("\n");
  }

  // ─── Private Methods ────────────────────────────────────────────

  /**
   * Get type-specific extraction hints for the LLM prompt.
   * Tells the LLM what parameters it can use with extract_file_content.
   */
  static getExtractionHint(type: string, sizeStr: string): string | null {
    switch (type) {
      case "video":
        return (
          `This video is ${sizeStr}. Use \`extract_file_content\` with \`start_time\`/\`end_time\` ` +
          `to get frames from specific time ranges (e.g., start_time=5, end_time=10, frame_count=3). ` +
          `Initial keyframes are already provided above.`
        );
      case "pdf":
        return (
          `This PDF is ${sizeStr}. Use \`extract_file_content\` with \`pages\` (e.g., [1, 3, 5]) ` +
          `or \`page_range\` (e.g., {start: 1, end: 10}) to get specific pages. ` +
          `Use \`read_file_section\` for line-range access or \`search_in_file\` to search.`
        );
      case "xlsx":
        return (
          `This spreadsheet is ${sizeStr}. Use \`extract_file_content\` with \`sheet\` (name or index), ` +
          `\`row_range\` (e.g., {start: 1, end: 50}), and \`columns\` (e.g., ["A", "B", "D"]) ` +
          `for targeted data extraction.`
        );
      case "pptx":
        return (
          `This presentation is ${sizeStr}. Use \`extract_file_content\` with \`pages\` ` +
          `(e.g., [1, 3, 5]) to extract specific slides.`
        );
      case "archive":
        return (
          `This archive is ${sizeStr}. Use \`extract_file_content\` with \`entry_path\` ` +
          `(e.g., "src/index.ts") to extract a specific file from the archive.`
        );
      case "audio":
        return (
          `This audio file is ${sizeStr}. Metadata is shown above. ` +
          `Use \`read_file_section\` or \`search_in_file\` for text-based access.`
        );
      default:
        return null;
    }
  }

  /**
   * Classify a file into a size tier based on byte size.
   */
  static classifySizeTier(sizeBytes: number): SizeTier {
    if (sizeBytes <= SIZE_TIER_THRESHOLDS.TINY_MAX) {
      return "tiny";
    }
    if (sizeBytes <= SIZE_TIER_THRESHOLDS.SMALL_MAX) {
      return "small";
    }
    if (sizeBytes <= SIZE_TIER_THRESHOLDS.MEDIUM_MAX) {
      return "medium";
    }
    if (sizeBytes <= SIZE_TIER_THRESHOLDS.LARGE_MAX) {
      return "large";
    }
    if (sizeBytes <= SIZE_TIER_THRESHOLDS.HUGE_MAX) {
      return "huge";
    }
    return "oversized";
  }

  /**
   * Process a binary file on-demand, extracting text content via the
   * appropriate processor. This bridges the gap between the lazy registration
   * path (which stores raw binary) and the LLM read tools (which need text).
   *
   * Called lazily on first readSection() or search() for non-text files.
   * Results are cached in ref.processedContent for subsequent reads.
   */
  private async processFileOnDemand(ref: FileReference): Promise<void> {
    // Prevent concurrent processing of the same file
    if (ref.status === "processing") {
      return;
    }
    ref.status = "processing";

    try {
      const buffer = ref.tempPath ? await readFile(ref.tempPath) : null;
      if (!buffer) {
        ref.status = "error";
        logger.warn(
          `[FileReferenceRegistry] No buffer available for on-demand processing: "${ref.filename}"`,
        );
        return;
      }

      let extractedText: string | null = null;

      switch (ref.detectedType) {
        case "pdf":
          extractedText = await this.extractPdfText(buffer);
          break;
        case "xlsx":
          extractedText = await this.extractExcelText(buffer, ref);
          break;
        case "docx":
          extractedText = await this.extractWordText(buffer, ref);
          break;
        case "pptx":
          extractedText = await this.extractPptxText(buffer);
          break;
        case "video":
          extractedText = await this.extractVideoContent(buffer, ref);
          break;
        case "audio":
          extractedText = await this.extractAudioContent(buffer, ref);
          break;
        case "archive":
          extractedText = await this.extractArchiveContent(buffer, ref);
          break;
        default:
          // For unknown binary types, provide a descriptive fallback
          extractedText =
            `[Binary file: ${ref.filename}, ${this.formatSize(ref.sizeBytes)}, type: ${ref.detectedType}]\n` +
            `This file could not be processed into text content.`;
          break;
      }

      if (extractedText) {
        ref.processedContent = extractedText;
        ref.status = "processed";
        // Update the preview with actual content instead of placeholder metadata
        const previewChars = this.defaultPreviewChars;
        if (extractedText.length <= previewChars) {
          ref.preview = extractedText;
        } else {
          const lastNewline = extractedText.lastIndexOf("\n", previewChars);
          ref.preview =
            lastNewline > previewChars * 0.8
              ? extractedText.substring(0, lastNewline)
              : extractedText.substring(0, previewChars) + "\n...[truncated]";
        }
        logger.info(
          `[FileReferenceRegistry] On-demand processed "${ref.filename}" ` +
            `(${ref.detectedType}, ${this.formatSize(ref.sizeBytes)}) → ${extractedText.length} chars`,
        );
      } else {
        ref.processedContent =
          `[${ref.detectedType.toUpperCase()} file: ${ref.filename}, ${this.formatSize(ref.sizeBytes)}]\n` +
          `Content could not be extracted. The file may be corrupted or in an unsupported format.`;
        ref.preview = ref.processedContent;
        ref.status = "processed";
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[FileReferenceRegistry] On-demand processing failed for "${ref.filename}": ${errorMsg}`,
      );
      ref.processedContent =
        `[Processing error for ${ref.filename}]\n` +
        `Type: ${ref.detectedType}, Size: ${this.formatSize(ref.sizeBytes)}\n` +
        `Error: ${errorMsg}`;
      ref.preview = ref.processedContent;
      ref.status = "error";
    }
  }

  /**
   * Extract text from a PDF buffer using pdf-parse v2 (pdfjs-dist under the hood).
   *
   * Handles compressed streams (FlateDecode), CMap-encoded text, modern PDFs,
   * and most text-based PDF formats. For scanned/image-only PDFs where no text
   * can be extracted, falls back to a descriptive message.
   */
  private async extractPdfText(buffer: Buffer): Promise<string | null> {
    try {
      const { PDFParse } = await import("pdf-parse");
      const pdf = new PDFParse({
        data: new Uint8Array(buffer),
      });

      try {
        const textResult = await pdf.getText({
          // Limit to first 100 pages to avoid unbounded processing
          last: 100,
        });

        const text = textResult.text?.trim();

        if (!text || text.length === 0) {
          // No text found — likely a scanned/image-only PDF
          const pageCount = textResult.total || 0;
          return (
            `[PDF document: ${this.formatSize(buffer.length)}, ${pageCount} page(s)]\n` +
            `This PDF appears to contain scanned images or non-extractable content.\n` +
            `Text could not be extracted from the document. The content may consist of:\n` +
            `- Scanned pages (images of text, not searchable text)\n` +
            `- Forms or graphical content\n` +
            `- Protected/encrypted content`
          );
        }

        // Clean up excessive blank lines
        const cleaned = text.replace(/\n{3,}/g, "\n\n");
        return cleaned;
      } finally {
        // Always clean up the PDF instance to free pdfjs-dist resources
        await pdf.destroy().catch(() => {
          /* cleanup - ignore destroy errors */
        });
      }
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Extract text content from an Excel file using ExcelProcessor.
   */
  private async extractExcelText(
    buffer: Buffer,
    ref: FileReference,
  ): Promise<string | null> {
    try {
      const { processExcel } = await import(
        "../processors/document/ExcelProcessor.js"
      );
      const result = await processExcel({
        id: ref.id,
        name: ref.filename,
        mimetype: ref.mimeType,
        size: ref.sizeBytes,
        buffer,
      });
      if (!result.success || !result.data) {
        return null;
      }
      // Format worksheets as TSV text for LLM consumption
      const worksheets = result.data.worksheets;
      if (worksheets && worksheets.length > 0) {
        const sections: string[] = [];
        for (const ws of worksheets) {
          sections.push(`## Sheet: ${ws.name}`);
          if (ws.headers.length > 0) {
            sections.push(ws.headers.join("\t"));
          }
          for (const row of ws.rows) {
            sections.push(
              row.map((cell) => (cell === null ? "" : String(cell))).join("\t"),
            );
          }
          sections.push("");
        }
        return sections.join("\n");
      }
      return null;
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] Excel extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Extract text content from a Word document using WordProcessor.
   */
  private async extractWordText(
    buffer: Buffer,
    ref: FileReference,
  ): Promise<string | null> {
    try {
      const { processWord } = await import(
        "../processors/document/WordProcessor.js"
      );
      const result = await processWord({
        id: ref.id,
        name: ref.filename,
        mimetype: ref.mimeType,
        size: ref.sizeBytes,
        buffer,
      });
      if (!result.success || !result.data) {
        return null;
      }
      return result.data.textContent || null;
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] Word extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Extract text from a PowerPoint file using PptxProcessor.
   */
  private async extractPptxText(buffer: Buffer): Promise<string | null> {
    try {
      const { PptxProcessor } = await import(
        "../processors/document/PptxProcessor.js"
      );
      return await PptxProcessor.extractText(buffer);
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] PPTX extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Extract metadata and content from a video file using VideoProcessor.
   */
  private async extractVideoContent(
    buffer: Buffer,
    ref: FileReference,
  ): Promise<string | null> {
    try {
      const { processVideo } = await import(
        "../processors/media/VideoProcessor.js"
      );
      const result = await processVideo({
        id: ref.id,
        name: ref.filename,
        mimetype: ref.mimeType,
        size: ref.sizeBytes,
        buffer,
      });
      if (!result.success || !result.data) {
        return null;
      }
      // Store keyframe images on the reference for injection into the prompt
      if (result.data.keyframes && result.data.keyframes.length > 0) {
        ref.extractedImages = result.data.keyframes;
        logger.info(
          `[FileReferenceRegistry] Extracted ${result.data.keyframes.length} keyframes from "${ref.filename}"`,
        );
      }
      return result.data.textContent || null;
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] Video extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Provide basic metadata even on failure
      return (
        `[Video file: ${ref.filename}, ${this.formatSize(ref.sizeBytes)}]\n` +
        `Video processing requires ffmpeg/ffprobe. Metadata could not be extracted.\n` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Extract metadata and content from an audio file using AudioProcessor.
   */
  private async extractAudioContent(
    buffer: Buffer,
    ref: FileReference,
  ): Promise<string | null> {
    try {
      const { processAudio } = await import(
        "../processors/media/AudioProcessor.js"
      );
      const result = await processAudio({
        id: ref.id,
        name: ref.filename,
        mimetype: ref.mimeType,
        size: ref.sizeBytes,
        buffer,
      });
      if (!result.success || !result.data) {
        return null;
      }
      return result.data.textContent || null;
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] Audio extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return (
        `[Audio file: ${ref.filename}, ${this.formatSize(ref.sizeBytes)}]\n` +
        `Audio processing failed. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Extract file listing from an archive using ArchiveProcessor.
   */
  private async extractArchiveContent(
    buffer: Buffer,
    ref: FileReference,
  ): Promise<string | null> {
    try {
      const { processArchive } = await import(
        "../processors/archive/ArchiveProcessor.js"
      );
      const result = await processArchive({
        id: ref.id,
        name: ref.filename,
        mimetype: ref.mimeType,
        size: ref.sizeBytes,
        buffer,
      });
      if (!result.success || !result.data) {
        return null;
      }
      return result.data.textContent || null;
    } catch (err) {
      logger.warn(
        `[FileReferenceRegistry] Archive extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Extract a preview from a buffer.
   * For text: first N characters.
   * For binary: type-specific metadata.
   */
  private extractPreview(
    buffer: Buffer,
    type: FileType,
    maxChars: number,
  ): string {
    if (this.isTextType(type, buffer)) {
      // Text-based: extract first N characters
      const text = buffer.toString(
        "utf-8",
        0,
        Math.min(buffer.length, maxChars + 100),
      );
      if (text.length <= maxChars) {
        return text;
      }
      // Break at line boundary
      const lastNewline = text.lastIndexOf("\n", maxChars);
      if (lastNewline > maxChars * 0.8) {
        return text.substring(0, lastNewline);
      }
      return text.substring(0, maxChars) + "\n...[truncated]";
    }

    // Binary types: type-specific preview
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    switch (type) {
      case "image":
        return `[Image file: ${sizeMB} MB]`;
      case "video":
        return `[Video file: ${sizeMB} MB — use read tools for metadata/keyframes]`;
      case "audio":
        return `[Audio file: ${sizeMB} MB — use read tools for metadata/transcript]`;
      case "archive":
        return `[Archive file: ${sizeMB} MB — use read tools for file listing]`;
      case "pdf":
        return `[PDF document: ${sizeMB} MB — use read tools for page content]`;
      default:
        return `[Binary file: ${sizeMB} MB, type: ${type}]`;
    }
  }

  /**
   * Detect file type from buffer magic bytes and extension.
   */
  private detectType(buffer: Buffer, ext: string): FileType {
    // Check magic bytes first
    if (buffer.length >= 4) {
      const header = buffer.subarray(0, 8);

      // PNG: 89 50 4E 47
      if (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      ) {
        return "image";
      }
      // JPEG: FF D8 FF
      if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
        return "image";
      }
      // GIF: 47 49 46
      if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        return "image";
      }
      // WebP: 52 49 46 46 ... 57 45 42 50
      if (
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return "image";
      }
      // PDF: 25 50 44 46
      if (
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46
      ) {
        return "pdf";
      }
      // ZIP (and derivatives: xlsx, docx, pptx)
      if (header[0] === 0x50 && header[1] === 0x4b) {
        // Differentiate by extension
        if (ext === "xlsx") {
          return "xlsx";
        }
        if (ext === "docx") {
          return "docx";
        }
        if (ext === "pptx") {
          return "pptx";
        }
        return "archive";
      }
      // MP4/M4A: ftyp
      if (
        buffer.length >= 8 &&
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70
      ) {
        if (["m4a", "aac"].includes(ext)) {
          return "audio";
        }
        return "video";
      }
      // ID3 (MP3): 49 44 33
      if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
        return "audio";
      }
      // OGG: 4F 67 67 53
      if (
        header[0] === 0x4f &&
        header[1] === 0x67 &&
        header[2] === 0x67 &&
        header[3] === 0x53
      ) {
        return "audio";
      }
      // FLAC: 66 4C 61 43
      if (
        header[0] === 0x66 &&
        header[1] === 0x4c &&
        header[2] === 0x61 &&
        header[3] === 0x43
      ) {
        return "audio";
      }
      // WAV: 52 49 46 46 ... 57 41 56 45
      if (
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x41 &&
        buffer[10] === 0x56 &&
        buffer[11] === 0x45
      ) {
        return "audio";
      }
      // MKV/WebM: 1A 45 DF A3
      if (
        header[0] === 0x1a &&
        header[1] === 0x45 &&
        header[2] === 0xdf &&
        header[3] === 0xa3
      ) {
        if (ext === "webm") {
          return "video";
        }
        return "video";
      }
      // AVI: 52 49 46 46 ... 41 56 49 20
      if (
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x41 &&
        buffer[9] === 0x56 &&
        buffer[10] === 0x49 &&
        buffer[11] === 0x20
      ) {
        return "video";
      }
    }

    // Fall back to extension
    return this.detectTypeFromExtension(ext);
  }

  /**
   * Detect file type from extension alone.
   */
  private detectTypeFromExtension(ext: string): FileType {
    const extensionMap: Record<string, FileType> = {
      // Images
      png: "image",
      jpg: "image",
      jpeg: "image",
      gif: "image",
      webp: "image",
      bmp: "image",
      tiff: "image",
      ico: "image",
      // Video
      mp4: "video",
      mkv: "video",
      webm: "video",
      avi: "video",
      mov: "video",
      m4v: "video",
      // Audio
      mp3: "audio",
      wav: "audio",
      ogg: "audio",
      flac: "audio",
      aac: "audio",
      m4a: "audio",
      wma: "audio",
      // Documents
      pdf: "pdf",
      docx: "docx",
      pptx: "pptx",
      xlsx: "xlsx",
      // Data
      csv: "csv",
      tsv: "csv",
      // Markup
      svg: "svg",
      // Archives
      zip: "archive",
      tar: "archive",
      gz: "archive",
      tgz: "archive",
      "7z": "archive",
      rar: "archive",
      // Text & Code
      txt: "text",
      md: "text",
      log: "text",
      json: "text",
      yaml: "text",
      yml: "text",
      xml: "text",
      html: "text",
      htm: "text",
      css: "text",
      js: "text",
      ts: "text",
      jsx: "text",
      tsx: "text",
      py: "text",
      java: "text",
      go: "text",
      rs: "text",
      rb: "text",
      php: "text",
      c: "text",
      cpp: "text",
      h: "text",
      cs: "text",
      swift: "text",
      kt: "text",
      scala: "text",
      sql: "text",
      sh: "text",
      bash: "text",
      zsh: "text",
      toml: "text",
      ini: "text",
      cfg: "text",
      env: "text",
      dockerfile: "text",
      makefile: "text",
    };

    return extensionMap[ext.toLowerCase()] || "unknown";
  }

  /**
   * Whether a file type contains readable text content.
   * For "unknown" types, optionally checks the buffer for valid UTF-8 text.
   */
  private isTextType(type: FileType, buffer?: Buffer): boolean {
    if (["text", "csv", "svg"].includes(type)) {
      return true;
    }
    // For unknown types, heuristically check if the buffer is likely text
    if (type === "unknown" && buffer && buffer.length > 0) {
      return FileReferenceRegistry.looksLikeText(buffer);
    }
    return false;
  }

  /**
   * Heuristic check: does a buffer look like valid text content?
   * Checks the first 512 bytes for mostly printable ASCII/UTF-8 characters.
   * Returns true if >90% of bytes are printable (ASCII 0x20-0x7E, tab, newline, CR).
   */
  private static looksLikeText(buffer: Buffer): boolean {
    const sampleSize = Math.min(buffer.length, 512);
    let printable = 0;
    for (let i = 0; i < sampleSize; i++) {
      const b = buffer[i];
      // Printable ASCII, tab, newline, carriage return, or high bytes (UTF-8 multibyte)
      if (
        (b >= 0x20 && b <= 0x7e) ||
        b === 0x09 ||
        b === 0x0a ||
        b === 0x0d ||
        b >= 0x80
      ) {
        printable++;
      }
    }
    return printable / sampleSize > 0.9;
  }

  /**
   * Guess MIME type from file type and extension.
   */
  private guessMimeType(type: FileType, ext: string): string {
    const mimeMap: Record<string, string> = {
      // By file type
      csv: "text/csv",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      video: "video/mp4",
      audio: "audio/mpeg",
      archive: "application/zip",
      image: "image/png",
    };

    if (mimeMap[type]) {
      return mimeMap[type];
    }

    // By extension
    const extMime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      mkv: "video/x-matroska",
      webm: "video/webm",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      flac: "audio/flac",
      json: "application/json",
      xml: "application/xml",
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      ts: "text/typescript",
      py: "text/x-python",
      zip: "application/zip",
      tar: "application/x-tar",
      gz: "application/gzip",
    };

    return extMime[ext.toLowerCase()] || "application/octet-stream";
  }

  /**
   * Guess file extension from magic bytes.
   */
  private guessExtension(buffer: Buffer): string {
    if (buffer.length < 4) {
      return "";
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return ".png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return ".jpg";
    }
    if (buffer[0] === 0x25 && buffer[1] === 0x50) {
      return ".pdf";
    }
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return ".zip";
    }
    if (buffer[0] === 0x49 && buffer[1] === 0x44) {
      return ".mp3";
    }

    // MP4/MOV/M4V — ftyp atom at offset 4
    if (
      buffer.length >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      // Check the brand to distinguish MOV vs MP4
      const brand = buffer.toString("ascii", 8, 12);
      if (brand === "qt  ") {
        return ".mov";
      }
      return ".mp4";
    }

    // MKV/WebM — EBML header (0x1A 0x45 0xDF 0xA3)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return ".mkv";
    }

    // AVI — RIFF....AVI
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x41 &&
      buffer[9] === 0x56 &&
      buffer[10] === 0x49
    ) {
      return ".avi";
    }

    // WAV — RIFF....WAVE
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return ".wav";
    }

    // FLAC
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x66 &&
      buffer[1] === 0x4c &&
      buffer[2] === 0x61 &&
      buffer[3] === 0x43
    ) {
      return ".flac";
    }

    // OGG
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return ".ogg";
    }

    return "";
  }

  /**
   * Persist a buffer to the temp directory.
   */
  private async persistToTemp(
    id: string,
    buffer: Buffer,
    ext: string,
  ): Promise<string> {
    // Check temp space budget
    if (this.currentTempBytes + buffer.length > this.maxTempBytes) {
      // Try evicting oldest files
      this.evictLRU();
      if (this.currentTempBytes + buffer.length > this.maxTempBytes) {
        throw new Error(
          `Temp directory budget exceeded (${this.formatSize(this.maxTempBytes)})`,
        );
      }
    }

    // Ensure temp directory exists
    if (!this.tempDirCreated) {
      await mkdir(this.tempDir, { recursive: true });
      this.tempDirCreated = true;
    }

    const tempPath = join(this.tempDir, `${id}${ext ? `.${ext}` : ""}`);
    await writeFile(tempPath, buffer);
    this.currentTempBytes += buffer.length;

    return tempPath;
  }

  /**
   * Evict the least recently used file reference.
   */
  private evictLRU(): void {
    let oldest: FileReference | null = null;
    let oldestId: string | null = null;

    for (const [id, ref] of this.files) {
      if (!oldest || ref.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = ref;
        oldestId = id;
      }
    }

    if (oldestId && oldest) {
      logger.info(
        `[FileReferenceRegistry] Evicting LRU: "${oldest.filename}" ` +
          `(last accessed ${new Date(oldest.lastAccessedAt).toISOString()})`,
      );

      // Clean up temp file if we created it
      if (oldest.tempPath && oldest.source !== "path") {
        unlink(oldest.tempPath).catch(() => {
          // Ignore cleanup errors
        });
        this.currentTempBytes -= oldest.sizeBytes;
      }

      this.files.delete(oldestId);
    }
  }

  /**
   * Format byte size as human-readable string.
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
