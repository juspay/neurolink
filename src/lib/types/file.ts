/**
 * File detection and processing types for unified file handling
 */

/**
 * Supported file types for multimodal input
 */
export type FileType =
  | "csv"
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "archive"
  | "text"
  | "svg"
  | "docx"
  | "pptx"
  | "xlsx"
  | "unknown";

/**
 * Office document types
 */
export type OfficeDocumentType = "docx" | "pptx" | "xlsx";

/**
 * File with metadata — allows callers to pass filename alongside a Buffer.
 *
 * This is the recommended way for applications (e.g. Slack bots) to pass
 * files that were downloaded as Buffers but still have original filenames.
 *
 * @example
 * ```typescript
 * files: [
 *   { buffer: pdfBuffer, filename: "quarterly-report.pdf" },
 *   { buffer: videoBuffer, filename: "meeting-recording.mov", mimetype: "video/quicktime" }
 * ]
 * ```
 */
export type FileWithMetadata = {
  buffer: Buffer;
  filename: string;
  mimetype?: string;
};

/**
 * File input can be Buffer, string (path/URL/data URI), or an object with metadata.
 */
export type FileInput = Buffer | string | FileWithMetadata;

/**
 * File source type for tracking input origin
 */
export type FileSource = "url" | "path" | "buffer" | "datauri";

/**
 * File detection result with confidence scoring
 */
export type FileDetectionResult = {
  type: FileType;
  mimeType: string;
  extension: string | null;
  source: FileSource;
  metadata: {
    size?: number;
    filename?: string;
    confidence: number; // 0-100
  };
};

/**
 * File processing result after detection and conversion
 */
export type FileProcessingResult = {
  type: FileType;
  content: string | Buffer;
  mimeType: string;
  /** Additional images extracted from the file (e.g., video keyframes, audio cover art) */
  images?: Array<Buffer | string>;
  metadata: {
    confidence: number;
    size?: number;
    filename?: string;
    extension?: string | null; // Original file extension (e.g., 'csv', 'tsv', 'txt')
    // CSV-specific metadata
    rowCount?: number;
    totalLines?: number;
    columnCount?: number;
    columnNames?: string[];
    sampleData?: string | unknown[];
    hasEmptyColumns?: boolean;
    /** Enhanced column metadata with type detection and statistics */
    columnMetadata?: CSVColumnMetadata[];
    /** Data quality warnings */
    dataQualityWarnings?: CSVDataQualityWarning[];
    /** Overall data quality score (0-100) */
    dataQualityScore?: number;
    /** Whether headers were detected */
    hasHeaders?: boolean;
    /** Detected delimiter */
    detectedDelimiter?: string;
    /** Detected (or overridden) character encoding used to decode the CSV (#362) */
    detectedEncoding?: string;
    /** Confidence (0-100) of the detected encoding (#362) */
    encodingConfidence?: number;
    /** Original→sanitized column-name mapping when sanitizeColumnNames is on (#378) */
    columnNameMapping?: Array<{ original: string; sanitized: string }>;
    /** True when the parse hit its time budget and returned partial rows (#379) */
    parseTimedOut?: boolean;
    // PDF-specific metadata
    version?: string;
    estimatedPages?: number | null;
    provider?: string;
    apiType?: PDFAPIType;
    /** Provider's citations requirement for visual PDF analysis (#349). */
    requiresCitations?: boolean | "auto";
    // Office-specific metadata
    officeFormat?: OfficeDocumentType;
    pageCount?: number;
    slideCount?: number;
    sheetCount?: number;
    sheetNames?: string[];
    author?: string;
    createdDate?: string;
    modifiedDate?: string;
    hasFormulas?: boolean;
    hasImages?: boolean;
    // Video-specific metadata
    frameCount?: number;
    hasKeyframes?: boolean;
  };
};

/**
 * Sample data format options for CSV metadata
 * - 'json': JSON string representation (default, backward compatible)
 * - 'object': Structured array of row objects (best for programmatic use)
 * - 'csv': CSV formatted string preview
 * - 'markdown': Markdown table format
 */
export type SampleDataFormat = "object" | "json" | "csv" | "markdown";

/**
 * Detected data type for a CSV column
 */
export type CSVColumnDataType =
  | "string"
  | "number"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "empty"
  | "mixed";

/**
 * Data quality warning for CSV columns
 */
export type CSVDataQualityWarning = {
  column: string;
  type:
    | "empty_values"
    | "invalid_name"
    | "mixed_types"
    | "high_null_rate"
    | "duplicates"
    | "inconsistent_format";
  message: string;
  severity: "info" | "warning" | "error";
  affectedRows?: number;
};

/**
 * Rich metadata for a single CSV column
 */
export type CSVColumnMetadata = {
  name: string;
  /** Original header text before sanitization, when sanitizeColumnNames rewrote it (#378) */
  originalName?: string;
  index: number;
  detectedType: CSVColumnDataType;
  /** Confidence of type detection (0-100) */
  typeConfidence: number;
  /** Count of null/empty values */
  nullCount: number;
  /** Count of unique values */
  uniqueCount: number;
  /** Sample values from this column (up to 5) */
  sampleValues: string[];
  /** For numeric columns: min value */
  minValue?: number;
  /** For numeric columns: max value */
  maxValue?: number;
  /** For numeric columns: average value */
  avgValue?: number;
  /** For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY') */
  dateFormat?: string;
  /** Column name validation issues */
  nameIssues?: string[];
};

/** A parsed CSV row: string-keyed with string (or missing) cell values (#384). */
export type CSVRow = Record<string, string | undefined>;

/** Result of decoding a buffer with encoding detection (#362). */
export type DecodedBuffer = {
  /** Decoded text with any BOM removed. */
  text: string;
  /** iconv-lite label actually used to decode. */
  encoding: string;
  /** Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback). */
  confidence: number;
};

/**
 * CSV processor options
 */
export type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
  sampleDataFormat?: SampleDataFormat;
  extension?: string | null;
  /**
   * Character encoding override (#362). When omitted, the encoding is detected
   * from a BOM then `chardet`, falling back to UTF-8. Accepts any label
   * `iconv-lite` supports (e.g. "utf-8", "utf-16le", "windows-1252", "latin1").
   */
  encoding?: string;
  /**
   * Rewrite column headers into valid identifiers (#378). Opt-in; default false
   * preserves the raw header strings as object keys.
   */
  sanitizeColumnNames?: boolean;
  /** Case style used when `sanitizeColumnNames` is on (#378). Default "snake_case". */
  columnNameCase?: "camelCase" | "snake_case";
  /**
   * Wall-clock cap for the streaming parse in milliseconds (#379). On timeout the
   * parse returns the rows collected so far and flags `metadata.parseTimedOut`,
   * rather than hanging forever. Defaults: 30s for strings, 5min for files.
   */
  parseTimeoutMs?: number;
  /**
   * Skip blank / whitespace-only data rows (#373). Default `true`: blank lines
   * are excluded from the returned content (including raw CSV text) and from
   * `metadata.rowCount`. Set to `false` to preserve empty lines literally.
   */
  skipEmptyLines?: boolean;
};

/**
 * PDF API types for different providers
 */
export type PDFAPIType = "document" | "files-api" | "unsupported";

/**
 * PDF provider configuration
 */
export type PDFProviderConfig = {
  maxSizeMB: number;
  maxPages: number;
  supportsNative: boolean;
  /**
   * Whether this provider needs source citations enabled for visual PDF
   * analysis (#349). `"auto"` = enable when the request requires visual
   * grounding (currently Bedrock's Converse document blocks); `false` = the
   * provider handles PDFs without an explicit citations flag. Surfaced on
   * `FileProcessingResult.metadata.requiresCitations` so downstream provider
   * adapters can act on it instead of the value being dead config.
   */
  requiresCitations: boolean | "auto";
  apiType: PDFAPIType;
};

/**
 * PDF processor options
 */
export type PDFProcessorOptions = {
  provider?: string;
  model?: string;
  maxSizeMB?: number;
  bedrockApiMode?: "converse" | "invokeModel";
  /**
   * Whether to enforce page limits by throwing an error (default: true)
   * Set to false to bypass limit enforcement (logs warning instead)
   */
  enforceLimits?: boolean;
  /** Password for an encrypted PDF (used on the image-conversion path) (#258). */
  password?: string;
};

/**
 * Audio provider configuration for transcription services
 *
 * Describes the capabilities and limitations of each audio transcription provider
 * (e.g., OpenAI Whisper, Google Speech-to-Text, Azure Speech Services).
 *
 * @example OpenAI Whisper configuration
 * ```typescript
 * const openaiConfig: AudioProviderConfig = {
 *   maxSizeMB: 25,
 *   maxDurationSeconds: 600,
 *   supportedFormats: ['mp3', 'mp4', 'm4a', 'wav', 'webm'],
 *   supportsLanguageDetection: true,
 *   requiresApiKey: true,
 *   costPer60s: 0.006  // $0.006 per minute
 * };
 * ```
 *
 * @example Google Speech-to-Text configuration
 * ```typescript
 * const googleConfig: AudioProviderConfig = {
 *   maxSizeMB: 10,
 *   maxDurationSeconds: 480,
 *   supportedFormats: ['flac', 'wav', 'mp3', 'ogg'],
 *   supportsLanguageDetection: true,
 *   requiresApiKey: true,
 *   costPer15s: 0.004  // $0.016 per minute ($0.004 per 15 seconds)
 * };
 * ```
 */
export type AudioProviderConfig = {
  /** Maximum audio file size in megabytes */
  maxSizeMB: number;
  /** Maximum audio duration in seconds */
  maxDurationSeconds: number;
  /** Supported audio formats (e.g., 'mp3', 'wav', 'm4a', 'flac', 'ogg') */
  supportedFormats: string[];
  /** Whether the provider supports automatic language detection */
  supportsLanguageDetection: boolean;
  /** Whether the provider requires an API key for authentication */
  requiresApiKey: boolean;
  /** Optional: Cost per 60 seconds of audio in USD */
  costPer60s?: number;
  /** Optional: Cost per 15 seconds of audio in USD */
  costPer15s?: number;
};

/**
 * Audio processor options
 */
export type AudioProcessorOptions = {
  /** AI provider to use for transcription (e.g., 'openai', 'google', 'azure') */
  provider?: string;
  /** Transcription model to use (e.g., 'whisper-1', 'chirp-3') */
  transcriptionModel?: string;
  /** Language code for transcription (e.g., 'en', 'es', 'fr') */
  language?: string;
  /** Context or prompt to guide transcription accuracy */
  prompt?: string;
  /** Maximum audio duration in seconds (default: 600) */
  maxDurationSeconds?: number;
  /** Maximum file size in megabytes */
  maxSizeMB?: number;
};

/**
 * Office processor options for Word, PowerPoint, and Excel documents
 *
 * @example Word document processing (docx)
 * ```typescript
 * const options: OfficeProcessorOptions = {
 *   format: "docx",
 *   extractTextOnly: false,
 *   includeMetadata: true
 * };
 * ```
 *
 * @example PowerPoint processing (pptx)
 * ```typescript
 * const options: OfficeProcessorOptions = {
 *   format: "pptx",
 *   includeSlideNotes: true,  // pptx-specific
 *   includeMetadata: true
 * };
 * ```
 *
 * @example Excel processing (xlsx)
 * ```typescript
 * const options: OfficeProcessorOptions = {
 *   format: "xlsx",
 *   processAllSheets: true,   // xlsx-specific
 *   includeMetadata: true
 * };
 * ```
 */
export type OfficeProcessorOptions = {
  /** Office document format type */
  format?: OfficeDocumentType;
  /** Whether to extract text only (true) or preserve formatting (false). Applies to: docx, pptx, xlsx */
  extractTextOnly?: boolean;
  /** Maximum file size in megabytes. Applies to: docx, pptx, xlsx */
  maxSizeMB?: number;
  /** Whether to include metadata (author, created date, etc.). Applies to: docx, pptx, xlsx */
  includeMetadata?: boolean;
  /** For spreadsheets (xlsx only): whether to process all sheets or just the first */
  processAllSheets?: boolean;
  /** For presentations (pptx only): whether to include slide notes */
  includeSlideNotes?: boolean;
};

/**
 * File detector options
 */
export type FileDetectorOptions = {
  maxSize?: number;
  timeout?: number;
  allowedTypes?: FileType[];
  /**
   * When set, local file paths must resolve inside this base directory;
   * anything that escapes it (absolute path, `../` traversal, or a symlink
   * pointing outside) is rejected. Containment is enforced on the real,
   * symlink-resolved path of both the base dir and the target, so a symlink
   * inside the base cannot be used to reach a file outside it. Servers that
   * accept file paths from untrusted callers should set this to sandbox
   * filesystem access; SDK callers loading their own files can omit it.
   */
  allowedBaseDir?: string;
  audioOptions?: AudioProcessorOptions;
  csvOptions?: CSVProcessorOptions;
  officeOptions?: OfficeProcessorOptions;
  confidenceThreshold?: number;
  provider?: string;
  /** Maximum number of retry attempts for network requests (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds with exponential backoff (default: 1000) */
  retryDelay?: number;
  /**
   * Caller-provided MIME type hint (e.g. "text/plain", "application/json").
   * Used when the filename has no extension and magic-byte detection cannot
   * identify the content — the common Slack/Curator extension-less-buffer
   * case. When set to a trustworthy mimetype (not "application/octet-stream"),
   * it short-circuits the detection strategy loop with a high-confidence
   * result so small files on the eager file-processing path still honor the
   * hint (the lazy FileReferenceRegistry path has its own hint-handling).
   */
  mimetypeHint?: string;
};

/**
 * Google AI Studio Files API types
 */
export type GoogleFilesAPIUploadResult = {
  file: {
    name: string;
    displayName: string;
    mimeType: string;
    sizeBytes: string;
    createTime: string;
    updateTime: string;
    expirationTime: string;
    sha256Hash: string;
    uri: string;
  };
};

// =============================================================================
// PDF PROCESSOR TYPES (moved from utils/pdfProcessor.ts)
// =============================================================================

/** Options for converting PDF pages to images. */
export type PDFImageConversionOptions = {
  /** Scale factor for image quality (1-4, default: 2) */
  scale?: number;
  /** Maximum number of pages to convert (default: 20 from PDF_LIMITS.DEFAULT_MAX_PAGES) */
  maxPages?: number;
  /** Output format (default: png). Only PNG is currently implemented by PDFProcessor. */
  format?: "png";
  /**
   * Per-page pixel ceiling (#260). Any page whose width×height×scale² would
   * exceed this is uniformly downscaled to stay under it, preventing a huge
   * page from allocating gigabytes of canvas. Default: PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS.
   */
  maxCanvasPixels?: number;
  /** Password for an encrypted PDF (passed to the underlying renderer) (#258). */
  password?: string;
  /** Per-page progress callback invoked as each page is rendered (#302). */
  onProgress?: (progress: PDFImageConversionProgress) => void | Promise<void>;
};

/** Progress reported per page during streaming conversion (#302). */
export type PDFImageConversionProgress = {
  /** Number of pages successfully converted so far. */
  pagesConverted: number;
  /** Total pages in the document (known up-front from the renderer). */
  totalPages: number;
  /** Elapsed time since conversion started, in milliseconds. */
  elapsedMs: number;
};

/** A single streamed page result (#302). `error` is set when that page failed. */
export type PDFImagePage = {
  /** 1-based page index. */
  pageIndex: number;
  /** Base64-encoded PNG for the page (empty string when `error` is set). */
  image: string;
  /** Byte size of the rendered PNG (0 when `error` is set). */
  imageSizeBytes: number;
  /** Populated when this page failed to render (#294). */
  error?: string;
};

/** Result of PDF to image conversion. */
export type PDFImageConversionResult = {
  /** Array of base64-encoded PNG images (one per successfully converted page) */
  images: string[];
  /** Number of pages converted */
  pageCount: number;
  /** Total conversion time in milliseconds */
  conversionTimeMs: number;
  /** Any warnings during conversion */
  warnings?: string[];
  /** Per-page failures — present only when some pages failed to render (#294). */
  errors?: Array<{ page: number; error: string }>;
};

// =============================================================================
// FILENAME SANITIZER TYPES (moved from utils/sanitizers/filename.ts)
// =============================================================================

/** Options for filename sanitization. */
export type SanitizeFileNameOptions = {
  /** Maximum length for the filename (default: 255) */
  maxLength?: number;
  /** Replacement character for invalid chars (default: '_') */
  replacement?: string;
  /** Whether to block dangerous extensions (default: true) */
  blockDangerousExtensions?: boolean;
  /** Whether to allow hidden files starting with dot (default: false) */
  allowHiddenFiles?: boolean;
};

/** Options for display name sanitization. */
export type SanitizeDisplayNameOptions = {
  /** Maximum length for the name (default: 100) */
  maxLength?: number;
  /** Whether to allow unicode characters (default: true) */
  allowUnicode?: boolean;
};

// =============================================================================
// SVG SANITIZER TYPES (moved from utils/sanitizers/svg.ts)
// =============================================================================

/** Result of SVG sanitization. */
export type SvgSanitizationResult = {
  /** Sanitized SVG content */
  content: string;
  /** Items that were removed during sanitization */
  removedItems: string[];
  /** Whether any content was modified */
  wasModified: boolean;
};

/** Contract implemented by each file-detection strategy. */
export type DetectionStrategy = {
  detect(input: FileInput): Promise<FileDetectionResult>;
};
