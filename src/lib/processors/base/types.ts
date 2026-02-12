/**
 * File Processor Types
 *
 * Single source of truth for ALL file processing type definitions.
 * All processor infrastructure, registry, and SDK types are defined here.
 *
 * @module processors/base/types
 */

import type { FileErrorCode } from "../errors/FileErrorCode.js";

// =============================================================================
// FILE INFORMATION
// =============================================================================

/**
 * Generic file information - provider agnostic.
 * Replaces Slack-specific SlackFileInfo with a universal interface.
 *
 * @example
 * ```typescript
 * const fileInfo: FileInfo = {
 *   id: 'doc-123',
 *   name: 'report.pdf',
 *   mimetype: 'application/pdf',
 *   size: 1024000,
 *   url: 'https://example.com/files/report.pdf',
 * };
 * ```
 */
export type FileInfo = {
  /** Unique identifier for the file */
  id: string;
  /** Original filename */
  name: string;
  /** MIME type of the file */
  mimetype: string;
  /** File size in bytes */
  size: number;
  /** Download URL (optional - use when file needs to be fetched) */
  url?: string;
  /** Direct file content (optional - use when file is already in memory) */
  buffer?: Buffer;
  /** Extensibility - additional provider-specific metadata */
  metadata?: Record<string, unknown>;
};

// =============================================================================
// PROCESSOR CONFIGURATION
// =============================================================================

/**
 * Configuration for file processors.
 * Defines constraints and defaults for a specific file type processor.
 */
export type FileProcessorConfig = {
  /** Maximum file size in megabytes */
  maxSizeMB: number;
  /** Download/processing timeout in milliseconds */
  timeoutMs: number;
  /** List of supported MIME types */
  supportedMimeTypes: string[];
  /** List of supported file extensions (with leading dot) */
  supportedExtensions: string[];
  /** Human-readable name for this file type (e.g., 'image', 'PDF') */
  fileTypeName: string;
  /** Default filename when original name is not available */
  defaultFilename: string;
};

// =============================================================================
// PROCESSED FILE RESULTS
// =============================================================================

/**
 * Base interface for processed file data.
 * All specific processed types should extend this interface.
 */
export type ProcessedFileBase = {
  /** File content as a Buffer */
  buffer: Buffer;
  /** MIME type of the processed content */
  mimetype: string;
  /** Size of the processed content in bytes */
  size: number;
  /** Filename (may be normalized or sanitized) */
  filename: string;
};

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Structured file processing error with user-friendly messaging.
 * This is the canonical error type used across all processor infrastructure.
 */
export type FileProcessingError = {
  /** Error code from FileErrorCode enum */
  code: FileErrorCode | string;
  /** Technical error message */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Suggested action to resolve the error */
  suggestedAction?: string;
  /** Whether this error is potentially retryable */
  retryable?: boolean;
  /** Additional context/details about the error */
  details?: Record<string, unknown>;
  /** Technical details (usually from original error) */
  technicalDetails?: string;
  /** Original error that caused this failure */
  originalError?: Error;
};

// =============================================================================
// OPERATION RESULTS
// =============================================================================

/**
 * Generic result type for internal operations.
 * Used for validation and download operations that don't return ProcessedFileBase.
 */
export type OperationResult<T = void> = {
  /** Whether the operation was successful */
  success: boolean;
  /** Operation result data (present when success is true) */
  data?: T;
  /** Error information (present when success is false) */
  error?: FileProcessingError;
};

/**
 * Result of a file processing operation.
 * Uses discriminated union pattern for type-safe error handling.
 *
 * @example
 * ```typescript
 * const result = await processor.processFile(fileInfo);
 * if (result.success) {
 *   console.log('Processed:', result.data.filename);
 * } else {
 *   console.error('Error:', result.error.userMessage);
 * }
 * ```
 */
export type FileProcessingResult<
  T extends ProcessedFileBase = ProcessedFileBase,
> = {
  /** Whether the processing was successful */
  success: boolean;
  /** Processed file data (present when success is true) */
  data?: T;
  /** Error information (present when success is false) */
  error?: FileProcessingError;
};

// =============================================================================
// PROCESSING OPTIONS
// =============================================================================

/**
 * Configuration for retry behavior on transient failures.
 * Implements exponential backoff with optional custom retry predicate.
 */
export type RetryConfig = {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Optional custom function to determine if an error is retryable */
  retryOn?: (error: Error) => boolean;
};

/**
 * Options for file processing operations.
 * Allows customization of download behavior and retry logic.
 */
export type ProcessOptions = {
  /** Authentication headers for download requests */
  authHeaders?: Record<string, string>;
  /** Override default timeout (in milliseconds) */
  timeout?: number;
  /** Retry configuration for transient failures */
  retryConfig?: RetryConfig;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default retry configuration for file downloads.
 * Uses exponential backoff: 1s, 2s, 4s (capped at maxDelayMs)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/** Default timeout for text file downloads (30 seconds) */
export const DEFAULT_TEXT_TIMEOUT_MS = 30000;

/** Default maximum size for text files (10 MB) */
export const DEFAULT_TEXT_MAX_SIZE_MB = 10;

/** Default timeout for image file downloads (30 seconds) */
export const DEFAULT_IMAGE_TIMEOUT_MS = 30000;

/** Default maximum size for image files (10 MB) */
export const DEFAULT_IMAGE_MAX_SIZE_MB = 10;

// =============================================================================
// BATCH PROCESSING TYPES
// =============================================================================

/**
 * Information about a successfully processed file.
 */
export type ProcessedFileInfo = {
  /** File identifier */
  fileId: string;
  /** Filename */
  filename: string;
  /** MIME type */
  mimetype: string;
  /** Size in bytes */
  size: number;
  /** Type of processor used */
  processorType: string;
};

/**
 * Information about a file that failed to process.
 */
export type FailedFileInfo = {
  /** File identifier */
  fileId: string;
  /** Filename */
  filename: string;
  /** MIME type */
  mimetype: string;
  /** Size in bytes */
  size: number;
  /** Error that caused the failure */
  error: FileProcessingError;
};

/**
 * Information about a file that was skipped.
 */
export type SkippedFileInfo = {
  /** File identifier */
  fileId: string;
  /** Filename */
  filename: string;
  /** MIME type */
  mimetype: string;
  /** Size in bytes */
  size: number;
  /** Reason for skipping */
  reason: string;
  /** Suggested alternative action */
  suggestedAlternative?: string;
};

/**
 * Warning about a file (non-fatal issue).
 */
export type FileWarning = {
  /** File identifier */
  fileId: string;
  /** Filename */
  filename: string;
  /** Warning message */
  message: string;
};

/**
 * Summary of batch file processing operations.
 */
export type BatchProcessingSummary<
  T extends ProcessedFileBase = ProcessedFileBase,
> = {
  /** Total number of files attempted */
  totalFiles: number;
  /** Successfully processed files */
  processedFiles: ProcessedFileInfo[];
  /** Files that failed to process */
  failedFiles: FailedFileInfo[];
  /** Files that were skipped (e.g., unsupported format) */
  skippedFiles: SkippedFileInfo[];
  /** Non-fatal warnings */
  warnings: FileWarning[];
  /** Processed results (parallel array with processedFiles) */
  results: T[];
};

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Result of finding a matching processor for a file.
 * Includes both the processor and metadata about the match quality.
 *
 * Note: `processor` is typed as `unknown` here to avoid circular dependency
 * on BaseFileProcessor. The registry module uses the properly typed version.
 */
export type ProcessorMatch<_T extends ProcessedFileBase = ProcessedFileBase> = {
  /** Name of the matched processor */
  name: string;

  /** The processor instance */
  processor: unknown;

  /** Priority level of this processor */
  priority: number;

  /**
   * Confidence score for the match (0-100).
   * Higher values indicate better match quality:
   * - 100: Exact MIME type match
   * - 80: MIME type prefix match (e.g., "image/*")
   * - 60: File extension match
   * - 40: Generic/fallback match
   */
  confidence: number;
};

/**
 * Options for registry operations.
 * Controls behavior when registering processors.
 */
export type RegistryOptions = {
  /**
   * Allow registering processors with duplicate names.
   * If false (default), an error is thrown on duplicate names.
   */
  allowDuplicates?: boolean;

  /**
   * Overwrite existing processor with the same name.
   * Takes precedence over allowDuplicates.
   */
  overwriteExisting?: boolean;
};

/**
 * Detailed error information for unsupported file types.
 * Provides helpful suggestions for the user.
 */
export type UnsupportedFileError = {
  /** Error code for programmatic handling */
  code: "NO_PROCESSOR_FOUND" | "PROCESSING_FAILED";

  /** Human-readable error message */
  message: string;

  /** Original filename */
  filename: string;

  /** MIME type of the file */
  mimetype: string;

  /** Helpful suggestion for the user */
  suggestion: string;

  /** List of supported file types */
  supportedTypes: string[];
};

/**
 * Result of processing a file through the registry.
 * Includes type information for tracking which processor was used.
 */
export type RegistryProcessResult<T = unknown> = {
  /** Type/name of the processor that handled the file */
  type: string;

  /** Processed data (null if processing failed) */
  data: T | null;

  /** Error information if processing failed */
  error?: UnsupportedFileError;
};

// =============================================================================
// PRIORITY CONSTANTS
// =============================================================================

/**
 * Priority levels for file processors.
 * Lower number = higher priority = matched first.
 *
 * This priority system ensures that:
 * - SVG files are processed as text (not images) since many AI providers don't support SVG format
 * - More specific processors match before generic ones
 * - Document types are processed in a logical order
 */
export const PROCESSOR_PRIORITIES = {
  /** SVG files - processed as text before image processing */
  SVG: 5,
  /** Image files - AI vision processing */
  IMAGE: 10,
  /** PDF documents */
  PDF: 20,
  /** CSV/tabular data */
  CSV: 30,
  /** Markdown files - structured text */
  MARKDOWN: 40,
  /** JSON data files */
  JSON: 50,
  /** YAML configuration/data files */
  YAML: 60,
  /** XML data files */
  XML: 70,
  /** HTML web content */
  HTML: 80,
  /** Excel spreadsheets */
  EXCEL: 90,
  /** Legacy .doc files */
  DOC: 95,
  /** Word documents (.docx) */
  WORD: 100,
  /** Plain text files */
  TEXT: 110,
  /** Source code files */
  SOURCE_CODE: 120,
  /** Configuration files */
  CONFIG: 130,
  /** RTF documents */
  RTF: 140,
  /** OpenDocument format files */
  OPENDOCUMENT: 150,
  /** Video files */
  VIDEO: 160,
  /** Audio files */
  AUDIO: 170,
  /** Archive files */
  ARCHIVE: 180,
} as const;

/**
 * Type for processor priority keys
 */
export type ProcessorPriorityKey = keyof typeof PROCESSOR_PRIORITIES;

/**
 * Type for processor priority values
 */
export type ProcessorPriorityValue =
  (typeof PROCESSOR_PRIORITIES)[ProcessorPriorityKey];

// =============================================================================
// PROCESSOR INFO
// =============================================================================

/**
 * Information about a registered processor.
 * Used for discovery and documentation.
 */
export type ProcessorInfo = {
  /** Unique name for the processor */
  name: string;
  /** Human-readable description */
  description: string;
  /** List of supported MIME types */
  supportedMimeTypes: string[];
  /** List of supported file extensions */
  supportedExtensions: string[];
  /** Priority level (lower = higher priority) */
  priority?: number;
};

// =============================================================================
// ERROR MESSAGE TEMPLATE
// =============================================================================

/**
 * Error message template with user-friendly messaging and retry information.
 * Re-exported from errors module for convenience.
 */
export type {
  ErrorMessageTemplate,
  FileErrorCode,
} from "../errors/FileErrorCode.js";

// =============================================================================
// SPECIFIC PROCESSED FILE TYPES
// =============================================================================

/**
 * Processed SVG result.
 * Extends ProcessedFileBase with SVG-specific fields.
 */
export type ProcessedSvg = ProcessedFileBase & {
  /** Sanitized SVG content as text for AI processing */
  textContent: string;
  /** Original raw content (only included if sanitization modified the content) */
  rawContent?: string;
  /** Whether sanitization was applied to the content */
  sanitized: boolean;
  /** Security warnings found during processing */
  securityWarnings: string[];
};

/**
 * Processed XML file result.
 */
export type ProcessedXml = ProcessedFileBase & {
  /** Original XML content */
  content: string;
  /** Parsed XML content (as JavaScript object) */
  parsed: unknown;
  /** Whether the XML is syntactically valid */
  valid: boolean;
  /** Error message if XML is invalid */
  errorMessage?: string;
  /** Name of the root element */
  rootElement?: string;
};

/**
 * Processed Markdown result.
 */
export type ProcessedMarkdown = ProcessedFileBase & {
  /** Original Markdown content */
  content: string;
  /** Total number of lines in the document */
  lineCount: number;
  /** Whether the document contains fenced code blocks */
  hasCodeBlocks: boolean;
  /** Whether the document contains Markdown tables */
  hasTables: boolean;
  /** List of headings extracted from the document */
  headings: string[];
};

/**
 * Processed source code result.
 */
export type ProcessedSourceCode = ProcessedFileBase & {
  /** The source code content (may be truncated) */
  content: string;
  /** Detected programming language (e.g., "TypeScript", "Python") */
  language: string;
  /** Number of lines in the content */
  lineCount: number;
  /** Whether the content was truncated due to line limit */
  truncated: boolean;
  /** Character encoding used to decode the file */
  encoding: string;
};

/**
 * Processed configuration file result.
 */
export type ProcessedConfig = ProcessedFileBase & {
  /** The configuration file content with redacted sensitive values */
  content: string;
  /** Detected configuration format */
  format: "env" | "ini" | "toml" | "properties" | "unknown";
  /** Extracted key-value pairs (with sensitive values redacted) */
  keyValues: Record<string, string>;
  /** List of keys that were redacted for security */
  redactedKeys: string[];
};

/**
 * Processed OpenDocument result.
 */
export type ProcessedOpenDocument = ProcessedFileBase & {
  /** Extracted text content */
  textContent: string;
  /** Document format type */
  format: "odt" | "ods" | "odp" | "unknown";
  /** Number of paragraphs/text elements found */
  paragraphCount: number;
  /** Whether content was truncated */
  truncated: boolean;
};

/**
 * Processed JSON file result.
 */
export type ProcessedJson = ProcessedFileBase & {
  /** Pretty-printed JSON content (or original content if invalid) */
  content: string;
  /** Original raw content before pretty-printing */
  rawContent: string;
  /** Parsed JSON object/array/value */
  parsed: unknown;
  /** Whether the JSON is syntactically valid */
  valid: boolean;
  /** Error message if JSON is invalid */
  errorMessage?: string;
  /** Number of top-level keys (for objects) */
  keyCount?: number;
  /** Length of the array (for arrays) */
  arrayLength?: number;
  /** Whether content was truncated */
  truncated: boolean;
};

/**
 * Processed plain text file result.
 */
export type ProcessedText = ProcessedFileBase & {
  /** Text content (may be truncated if file is too large) */
  content: string;
  /** Total number of lines in the original file */
  lineCount: number;
  /** Total number of words in the original file */
  wordCount: number;
  /** Character encoding used to decode the file */
  encoding: string;
  /** Whether the content was truncated due to size limits */
  truncated: boolean;
};

/**
 * Processed HTML file result.
 */
export type ProcessedHtml = ProcessedFileBase & {
  /** Original HTML content */
  content: string;
  /** Text extracted from HTML (all tags stripped) */
  textContent: string;
  /** Whether the HTML contains script tags */
  hasScripts: boolean;
  /** Whether the HTML contains style tags */
  hasStyles: boolean;
  /** Page title extracted from title tag, if present */
  title?: string;
  /** Whether the HTML contains potentially dangerous content (XSS vectors) */
  hasDangerousContent: boolean;
};

/**
 * Processed YAML file result.
 */
export type ProcessedYaml = ProcessedFileBase & {
  /** Original YAML content */
  content: string;
  /** Parsed YAML content (as JavaScript object) */
  parsed: unknown;
  /** Whether the YAML is syntactically valid */
  valid: boolean;
  /** Error message if YAML is invalid */
  errorMessage?: string;
  /** YAML content converted to JSON string for AI consumption */
  asJson: string | null;
};

/**
 * Single worksheet extracted from an Excel file.
 */
export type ExcelWorksheet = {
  /** Name of the worksheet (tab name in Excel) */
  name: string;
  /** Row data as a 2D array. Each inner array represents a row. */
  rows: (string | number | boolean | null)[][];
  /** Headers extracted from the first row */
  headers: string[];
  /** Number of rows extracted (may be less than actual if truncated) */
  rowCount: number;
  /** Number of columns (based on headers or first row) */
  columnCount: number;
};

/**
 * Processed Excel file result.
 */
export type ProcessedExcel = ProcessedFileBase & {
  /** Array of processed worksheets */
  worksheets: ExcelWorksheet[];
  /** Number of sheets processed (may be less than total if truncated) */
  sheetCount: number;
  /** Total number of rows across all worksheets */
  totalRows: number;
  /** Whether any data was truncated due to limits */
  truncated: boolean;
  /** Names of sheets that were truncated */
  truncatedSheets: string[];
};

/**
 * Processed Word document result.
 */
export type ProcessedWord = ProcessedFileBase & {
  /** Extracted plain text content from the Word document */
  textContent: string;
  /** HTML representation of the Word document */
  htmlContent: string;
  /** Warnings from mammoth extraction (e.g., unsupported elements) */
  warnings: string[];
};

/**
 * Processed RTF document result.
 */
export type ProcessedRtf = ProcessedFileBase & {
  /** Extracted plain text content from the RTF document */
  textContent: string;
  /** Raw RTF content (preserved for debugging/analysis) */
  rawContent: string;
};

/**
 * Type guard function signature for JSON parsing.
 */
export type JsonTypeGuard<T> = (parsed: unknown) => parsed is T;
