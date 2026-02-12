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
    // PDF-specific metadata
    version?: string;
    estimatedPages?: number | null;
    provider?: string;
    apiType?: PDFAPIType;
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

/**
 * CSV processor options
 */
export type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
  sampleDataFormat?: SampleDataFormat;
  extension?: string | null;
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
  audioOptions?: AudioProcessorOptions;
  csvOptions?: CSVProcessorOptions;
  officeOptions?: OfficeProcessorOptions;
  confidenceThreshold?: number;
  provider?: string;
  /** Maximum number of retry attempts for network requests (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds with exponential backoff (default: 1000) */
  retryDelay?: number;
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
