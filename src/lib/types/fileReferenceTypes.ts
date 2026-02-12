/**
 * File Reference Architecture Types (canonical location)
 *
 * Types for the lazy on-demand file processing system.
 * Files are registered as lightweight references with metadata and previews.
 * Full content is processed on-demand when the LLM requests it via tools.
 */

import type { FileSource, FileType } from "./fileTypes.js";

/**
 * Size tier determines the processing strategy for a file.
 *
 * - tiny:     Inline in prompt (current behavior)
 * - small:    Full load, truncate to budget
 * - medium:   Outline + on-demand sections
 * - large:    Stream + chunked summarization
 * - huge:     Reference only + tool-based access
 * - oversized: Reject with informative message
 */
export type SizeTier =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "oversized";

/**
 * Processing status of a file reference
 */
export type FileReferenceStatus =
  | "registered"
  | "previewed"
  | "processing"
  | "processed"
  | "error";

/**
 * A section in a file outline (used for code, PDFs, spreadsheets)
 */
export type OutlineSection = {
  /** Section heading/name (e.g., function name, class name, sheet name) */
  name: string;
  /** Type of section (function, class, import, sheet, page, heading) */
  kind: string;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Nesting depth (0 = top-level) */
  depth: number;
  /** Child sections (e.g., methods within a class) */
  children?: OutlineSection[];
};

/**
 * A lightweight reference to a file registered for on-demand processing.
 *
 * Registration is fast (~1ms): only stat + magic bytes + first 1KB preview.
 * Full processing is deferred until the LLM requests it via tools.
 */
export type FileReference = {
  /** Unique identifier (UUID v4) */
  id: string;
  /** How the file was provided */
  source: FileSource;
  /** Original file path or URL */
  originalPath?: string;
  /** Display name */
  filename: string;
  /** Original file size in bytes */
  sizeBytes: number;
  /** Detected file type from magic bytes / extension */
  detectedType: FileType;
  /** Detected MIME type */
  mimeType: string;
  /** Size tier determining processing strategy */
  sizeTier: SizeTier;
  /** Estimated tokens after processing (type-aware) */
  estimatedTokens: number;
  /** First ~500 tokens of content (lightweight preview) */
  preview: string;
  /** Current processing status */
  status: FileReferenceStatus;
  /** LLM-generated summary (populated lazily via summarize_file tool) */
  summary?: string;
  /** Structural outline for code/docs (populated lazily) */
  outlineSections?: OutlineSection[];
  /** Path in temp directory where buffer is persisted */
  tempPath?: string;
  /** Provider file API ID (for Anthropic Files API, Gemini File API, etc.) */
  providerId?: string;
  /** Full processed content (cached after first full processing) */
  processedContent?: string;
  /** Extracted images (e.g., video keyframes, PPTX slide images) */
  extractedImages?: Buffer[];
  /** Timestamp when the file was registered */
  registeredAt: number;
  /** Timestamp when the file was last accessed (for LRU eviction) */
  lastAccessedAt: number;
  /** Total line count (for text files, populated on first read) */
  totalLines?: number;
  /** File extension (e.g., 'py', 'xlsx', 'mp4') */
  extension?: string;
};

/**
 * Options for registering a file
 */
export type FileRegistrationOptions = {
  /** Override filename detection */
  filename?: string;
  /** Override file type detection */
  fileType?: FileType;
  /** Maximum preview length in characters */
  maxPreviewChars?: number;
  /** Skip persisting buffer to temp directory */
  skipTempPersist?: boolean;
};

/**
 * Result of reading a file section
 */
export type FileReadResult = {
  /** The content that was read */
  content: string;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Total lines in the file */
  totalLines: number;
  /** Whether the content was truncated to fit token budget */
  truncated: boolean;
  /** Number of tokens in the returned content */
  estimatedTokens: number;
};

/**
 * Result of searching within a file
 */
export type FileSearchResult = {
  /** Matching lines with context */
  matches: FileSearchMatch[];
  /** Total number of matches found */
  totalMatches: number;
  /** Whether results were truncated */
  truncated: boolean;
};

/**
 * A single search match within a file
 */
export type FileSearchMatch = {
  /** Line number (1-indexed) */
  lineNumber: number;
  /** The matching line content */
  line: string;
  /** Context lines before the match */
  contextBefore: string[];
  /** Context lines after the match */
  contextAfter: string[];
};

/**
 * Options for the streaming reader
 */
export type StreamingReaderOptions = {
  /** Maximum tokens to read (stops when budget exhausted) */
  tokenBudget?: number;
  /** Starting line number (1-indexed, default 1) */
  startLine?: number;
  /** Ending line number (1-indexed, default EOF) */
  endLine?: number;
  /** Encoding (default 'utf-8') */
  encoding?: BufferEncoding;
  /** Provider name for token estimation multiplier */
  provider?: string;
};

/**
 * Parameters for targeted content extraction via extract_file_content tool.
 * Different file types use different subsets of these parameters.
 */
export type FileExtractionParams = {
  /** File ID (UUID) or filename */
  file_id: string;

  // --- Video parameters ---
  /** Start timestamp in seconds (video) */
  start_time?: number;
  /** End timestamp in seconds (video) */
  end_time?: number;
  /** Number of frames to extract in range (video, default: 5) */
  frame_count?: number;

  // --- PDF / PPTX parameters ---
  /** Specific page/slide numbers (1-indexed) */
  pages?: number[];
  /** Page range (1-indexed, inclusive) */
  page_range?: { start: number; end: number };

  // --- Spreadsheet parameters ---
  /** Sheet name or 0-based index */
  sheet?: string | number;
  /** Row range (1-indexed) */
  row_range?: { start: number; end: number };
  /** Specific columns (e.g., ["A", "B", "D"]) */
  columns?: string[];

  // --- Archive parameters ---
  /** File path within the archive */
  entry_path?: string;

  // --- General ---
  /** Output format hint */
  format?: "text" | "detailed" | "summary";
};

/**
 * Result of targeted content extraction.
 * May contain text, images, or both depending on the extraction type.
 */
export type FileExtractionResult = {
  /** Whether the extraction succeeded */
  success: boolean;
  /** Extracted text content */
  text?: string;
  /** Extracted images as JPEG buffers (e.g., video frames, slide renders) */
  images?: Buffer[];
  /** Metadata about the extraction */
  metadata?: Record<string, unknown>;
  /** Error message if extraction failed */
  error?: string;
};

/**
 * Options for the file reference registry
 */
export type FileRegistryOptions = {
  /** Directory for persisting file buffers (default: os.tmpdir()/neurolink-files/) */
  tempDir?: string;
  /** Maximum number of file references to keep (LRU eviction, default: 100) */
  maxFiles?: number;
  /** Maximum total bytes to persist to temp (default: 1GB) */
  maxTempBytes?: number;
  /** Default preview length in characters (default: 2000) */
  defaultPreviewChars?: number;
};
