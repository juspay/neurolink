/**
 * File Processor Types
 *
 * Centralized type definitions for the file processing system.
 * These types are re-exported from the main types barrel for SDK consumers.
 *
 * @module types/processorTypes
 */

// =============================================================================
// FILE INFORMATION
// =============================================================================

/**
 * Generic file information - provider agnostic.
 * Replaces Slack-specific SlackFileInfo with a universal interface.
 *
 * @example
 * ```typescript
 * // From a URL source
 * const fileInfo: FileInfo = {
 *   id: 'doc-123',
 *   name: 'report.pdf',
 *   mimetype: 'application/pdf',
 *   size: 1024000,
 *   url: 'https://example.com/files/report.pdf',
 * };
 *
 * // From a buffer source
 * const fileInfo: FileInfo = {
 *   id: 'img-456',
 *   name: 'photo.jpg',
 *   mimetype: 'image/jpeg',
 *   size: 512000,
 *   buffer: imageBuffer,
 * };
 * ```
 */
export type ProcessorFileInfo = {
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

/**
 * Structured error information for file processing failures.
 * Provides both technical details and user-friendly messaging.
 */
export type ProcessorFileError = {
  /** Error code for programmatic handling (typed enum or string for extensibility) */
  code: FileProcessorErrorCode | string;
  /** Technical error message */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Additional context/details about the error */
  details?: Record<string, unknown>;
};

/**
 * Generic result type for internal operations.
 * Uses discriminated union pattern for type-safe success/failure handling.
 * Used for validation and download operations that don't return ProcessedFileBase.
 */
export type ProcessorOperationResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: ProcessorFileError };

/**
 * Result of a file processing operation.
 * Uses discriminated union pattern for type-safe error handling.
 */
export type ProcessorFileResult<
  T extends ProcessedFileBase = ProcessedFileBase,
> = { success: true; data: T } | { success: false; error: ProcessorFileError };

// =============================================================================
// PROCESSING OPTIONS
// =============================================================================

/**
 * Configuration for retry behavior on transient failures.
 * Implements exponential backoff with optional custom retry predicate.
 */
export type ProcessorRetryConfig = {
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
export type ProcessorProcessOptions = {
  /** Authentication headers for download requests */
  authHeaders?: Record<string, string>;
  /** Override default timeout (in milliseconds) */
  timeout?: number;
  /** Retry configuration for transient failures */
  retryConfig?: ProcessorRetryConfig;
};

// =============================================================================
// BATCH PROCESSING TYPES
// =============================================================================

/**
 * Information about a successfully processed file.
 */
export type ProcessorProcessedFileInfo = {
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
export type ProcessorFailedFileInfo = {
  /** File identifier */
  fileId: string;
  /** Filename */
  filename: string;
  /** MIME type */
  mimetype: string;
  /** Size in bytes */
  size: number;
  /** Error that caused the failure */
  error: ProcessorFileError;
};

/**
 * Information about a file that was skipped.
 */
export type ProcessorSkippedFileInfo = {
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
export type ProcessorFileWarning = {
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
export type ProcessorBatchSummary<
  T extends ProcessedFileBase = ProcessedFileBase,
> = {
  /** Total number of files attempted */
  totalFiles: number;
  /** Successfully processed files */
  processedFiles: ProcessorProcessedFileInfo[];
  /** Files that failed to process */
  failedFiles: ProcessorFailedFileInfo[];
  /** Files that were skipped (e.g., unsupported format) */
  skippedFiles: ProcessorSkippedFileInfo[];
  /** Non-fatal warnings */
  warnings: ProcessorFileWarning[];
  /** Processed results (parallel array with processedFiles) */
  results: T[];
};

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Result of finding a matching processor for a file.
 * Includes both the processor and metadata about the match quality.
 */
export type ProcessorMatch<_T extends ProcessedFileBase = ProcessedFileBase> = {
  /** Name of the matched processor */
  name: string;

  /** The processor instance (generic to avoid circular dependency) */
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
export type ProcessorRegistryOptions = {
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
export type ProcessorUnsupportedFileError = {
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
export type ProcessorRegistryResult<T = unknown> = {
  /** Type/name of the processor that handled the file */
  type: string;

  /** Processed data (null if processing failed) */
  data: T | null;

  /** Error information if processing failed */
  error?: ProcessorUnsupportedFileError;
};

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Enumeration of all file processing error codes.
 * Each code represents a specific failure scenario with associated messaging.
 */
export enum FileProcessorErrorCode {
  // Download errors
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  DOWNLOAD_TIMEOUT = "DOWNLOAD_TIMEOUT",
  DOWNLOAD_AUTH_FAILED = "DOWNLOAD_AUTH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",

  // Validation errors
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_MIME_TYPE = "INVALID_MIME_TYPE",
  INVALID_MAGIC_BYTES = "INVALID_MAGIC_BYTES",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  INVALID_STRUCTURE = "INVALID_STRUCTURE",

  // Processing errors
  PROCESSING_FAILED = "PROCESSING_FAILED",
  PARSING_FAILED = "PARSING_FAILED",
  ENCODING_ERROR = "ENCODING_ERROR",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  DECOMPRESSION_FAILED = "DECOMPRESSION_FAILED",

  // Security errors
  SECURITY_VALIDATION_FAILED = "SECURITY_VALIDATION_FAILED",
  XXE_DETECTED = "XXE_DETECTED",
  XSS_DETECTED = "XSS_DETECTED",
  CODE_EXECUTION_DETECTED = "CODE_EXECUTION_DETECTED",
  ZIP_BOMB_DETECTED = "ZIP_BOMB_DETECTED",

  // System errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Error message template with user-friendly messaging and retry information.
 */
export type ProcessorErrorMessageTemplate = {
  /** Technical error message */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Suggested action to resolve the error */
  suggestedAction: string;
  /** Whether this error is potentially retryable */
  retryable: boolean;
};

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
// PRIORITY CONSTANTS
// =============================================================================

/**
 * Priority levels for file processors.
 * Lower number = higher priority = matched first.
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
// SPECIFIC PROCESSED FILE TYPES
// =============================================================================
// These interfaces were consolidated from individual processor files
// to provide a single source of truth. Each processor file re-exports
// its type from here for backward compatibility.

/**
 * Processed SVG result.
 * Extends ProcessedFileBase with SVG-specific fields.
 *
 * @example
 * ```typescript
 * const result: ProcessedSvg = {
 *   textContent: '<svg><rect fill="red"/></svg>',
 *   rawContent: undefined, // Only present if sanitization modified content
 *   sanitized: false,
 *   securityWarnings: [],
 *   buffer: Buffer.from('...'),
 *   mimetype: 'image/svg+xml',
 *   size: 1234,
 *   filename: 'diagram.svg',
 * };
 * ```
 */
export type ProcessedSvg = ProcessedFileBase & {
  /** Sanitized SVG content as text for AI processing */
  textContent: string;

  /** Original raw content (only included if sanitization modified the content, for debugging) */
  rawContent?: string;

  /** Whether sanitization was applied to the content */
  sanitized: boolean;

  /** Security warnings found during processing */
  securityWarnings: string[];
};

/**
 * Processed XML file result.
 * Extends base processed file with XML-specific fields.
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
 * Extends ProcessedFileBase with Markdown-specific fields.
 *
 * @example
 * ```typescript
 * const result: ProcessedMarkdown = {
 *   content: '# Hello\n\nWorld',
 *   lineCount: 3,
 *   hasCodeBlocks: false,
 *   hasTables: false,
 *   headings: ['Hello'],
 *   buffer: Buffer.from('...'),
 *   mimetype: 'text/markdown',
 *   size: 1234,
 *   filename: 'README.md',
 * };
 * ```
 */
export type ProcessedMarkdown = ProcessedFileBase & {
  /** Original Markdown content */
  content: string;

  /** Total number of lines in the document */
  lineCount: number;

  /** Whether the document contains fenced code blocks (```) */
  hasCodeBlocks: boolean;

  /** Whether the document contains Markdown tables */
  hasTables: boolean;

  /** List of headings extracted from the document (text only, no # prefix) */
  headings: string[];
};

/**
 * Processed source code result.
 * Contains the code content with metadata for language detection and truncation status.
 *
 * @example
 * ```typescript
 * const processedCode: ProcessedSourceCode = {
 *   content: "const x = 1;",
 *   language: "TypeScript",
 *   lineCount: 100,
 *   truncated: false,
 *   encoding: "utf-8",
 *   buffer: codeBuffer,
 *   mimetype: "text/plain",
 *   size: 1024,
 *   filename: "app.ts",
 * };
 * ```
 */
export type ProcessedSourceCode = ProcessedFileBase & {
  /** The source code content (may be truncated) */
  content: string;

  /** Detected programming language (e.g., "TypeScript", "Python") */
  language: string;

  /** Number of lines in the content (after truncation if applicable) */
  lineCount: number;

  /** Whether the content was truncated due to line limit */
  truncated: boolean;

  /** Character encoding used to decode the file */
  encoding: string;
};

/**
 * Processed configuration file result.
 * Contains the file content with security-redacted values and structured key-value pairs.
 *
 * @example
 * ```typescript
 * const processedConfig: ProcessedConfig = {
 *   content: "API_URL=https://api.example.com\nAPI_KEY=[REDACTED]",
 *   format: "env",
 *   keyValues: { API_URL: "https://api.example.com", API_KEY: "[REDACTED]" },
 *   redactedKeys: ["API_KEY"],
 *   buffer: configBuffer,
 *   mimetype: "text/plain",
 *   size: 512,
 *   filename: ".env",
 * };
 * ```
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
 * Processed OpenDocument result
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
 * Type guard function signature for JSON parsing
 */
export type JsonTypeGuard<T> = (parsed: unknown) => parsed is T;
