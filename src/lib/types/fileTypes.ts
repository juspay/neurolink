/**
 * File detection and processing types for unified file handling
 */

/**
 * Supported file types for multimodal input
 */
export type FileType = "csv" | "image" | "pdf" | "audio" | "text" | "unknown";

/**
 * File input can be Buffer or string (path/URL/data URI)
 */
export type FileInput = Buffer | string;

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
  metadata: {
    confidence: number;
    size?: number;
    filename?: string;
    // CSV-specific metadata
    rowCount?: number;
    columnCount?: number;
    columnNames?: string[];
    sampleData?: string | unknown[];
    hasEmptyColumns?: boolean;
    // PDF-specific metadata
    version?: string;
    estimatedPages?: number | null;
    provider?: string;
    apiType?: PDFAPIType;
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
 * CSV processor options
 */
export type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
  sampleDataFormat?: SampleDataFormat;
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
 * File detector options
 */
export type FileDetectorOptions = {
  maxSize?: number;
  timeout?: number;
  allowedTypes?: FileType[];
  audioOptions?: AudioProcessorOptions;
  csvOptions?: CSVProcessorOptions;
  confidenceThreshold?: number;
  provider?: string;
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
