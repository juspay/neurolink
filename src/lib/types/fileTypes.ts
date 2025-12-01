/**
 * File detection and processing types for unified file handling
 */

/**
 * Supported file types for multimodal input
 */
export type FileType = "csv" | "image" | "pdf" | "text" | "unknown";

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
    // Image-specific metadata (format conversion)
    originalSize?: number;
    // CSV-specific metadata
    rowCount?: number;
    columnCount?: number;
    columnNames?: string[];
    sampleData?: string;
    hasEmptyColumns?: boolean;
    // PDF-specific metadata
    version?: string;
    estimatedPages?: number | null;
    provider?: string;
    apiType?: PDFAPIType;
  };
};

/**
 * CSV processor options
 */
export type CSVProcessorOptions = {
  maxRows?: number;
  formatStyle?: "raw" | "markdown" | "json";
  includeHeaders?: boolean;
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
 * File detector options
 */
export type FileDetectorOptions = {
  maxSize?: number;
  timeout?: number;
  allowedTypes?: FileType[];
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

/**
 * Image format conversion output format
 */
export type ImageOutputFormat = "jpeg" | "png" | "webp";

/**
 * Image conversion options
 */
export type ImageConversionOptions = {
  /** Target output format (default: 'jpeg' for HEIC, 'png' for TIFF) */
  outputFormat?: ImageOutputFormat;
  /** JPEG/WebP quality (1-100, default: 90) */
  quality?: number;
  /** Whether to convert unsupported formats automatically (default: true) */
  autoConvert?: boolean;
};

/**
 * Image processor options (combines detection and conversion)
 */
export type ImageProcessorOptions = {
  /** Conversion options for unsupported formats */
  conversion?: ImageConversionOptions;
};
