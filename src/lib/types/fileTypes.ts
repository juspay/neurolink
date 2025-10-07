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
    // CSV-specific metadata (extracted from csv-parser)
    rowCount?: number;
    columnCount?: number;
    columnNames?: string[];
    sampleData?: string;
    hasEmptyColumns?: boolean;
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
 * File detector options
 */
export type FileDetectorOptions = {
  maxSize?: number;
  timeout?: number;
  allowedTypes?: FileType[];
  csvOptions?: CSVProcessorOptions;
  confidenceThreshold?: number;
};
