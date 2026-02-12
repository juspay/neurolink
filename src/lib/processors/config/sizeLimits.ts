/**
 * Size Limit Constants
 * Centralized size limits for file processing and validation
 *
 * @module processors/config/sizeLimits
 */

// =============================================================================
// FILE SIZE LIMITS (in MB)
// =============================================================================

/**
 * Maximum file sizes in megabytes for different file types
 */
export const SIZE_LIMITS_MB = {
  /** Maximum image file size (10MB) */
  IMAGE_MAX_MB: 10,
  /** Maximum PDF file size (100MB — enterprise reports, long research papers) */
  PDF_MAX_MB: 100,
  /** Maximum document file size (100MB — enterprise docs with embedded images) */
  DOCUMENT_MAX_MB: 100,
  /** Maximum Word document size (100MB — PRDs, specs with embedded media) */
  WORD_MAX_MB: 100,
  /** Maximum text file size (50MB — large log files, build output) */
  TEXT_MAX_MB: 50,
  /** Maximum CSV file size (50MB — large data exports) */
  CSV_MAX_MB: 50,
  /** Maximum Excel file size (100MB — enterprise spreadsheets, data exports) */
  EXCEL_MAX_MB: 100,
  /** Maximum source code file size (20MB — large codebases) */
  SOURCE_CODE_MAX_MB: 20,
  /** Maximum JSON file size (20MB — large API response dumps) */
  JSON_MAX_MB: 20,
  /** Maximum YAML file size (20MB — large config files) */
  YAML_MAX_MB: 20,
  /** Maximum XML file size (20MB — large config/data files) */
  XML_MAX_MB: 20,
  /** Maximum video file size (500MB — long meeting recordings, screen captures) */
  VIDEO_MAX_MB: 500,
  /** Maximum audio file size (500MB — long meeting recordings, call recordings) */
  AUDIO_MAX_MB: 500,
  /** Maximum archive file size (200MB — large project archives) */
  ARCHIVE_MAX_MB: 200,
  /** Maximum general file size (200MB — matches Curator's memory-safety cap) */
  GENERAL_MAX_MB: 200,
} as const;

// =============================================================================
// FILE SIZE LIMITS (in bytes)
// =============================================================================

/**
 * Maximum file sizes in bytes for different file types
 */
export const SIZE_LIMITS_BYTES = {
  /** Maximum image file size (10MB) */
  IMAGE_MAX: 10 * 1024 * 1024,
  /** Maximum PDF file size (100MB) */
  PDF_MAX: 100 * 1024 * 1024,
  /** Maximum document file size (100MB) */
  DOCUMENT_MAX: 100 * 1024 * 1024,
  /** Maximum Word document size (100MB) */
  WORD_MAX: 100 * 1024 * 1024,
  /** Maximum text file size (50MB) */
  TEXT_MAX: 50 * 1024 * 1024,
  /** Maximum CSV file size (50MB) */
  CSV_MAX: 50 * 1024 * 1024,
  /** Maximum Excel file size (100MB) */
  EXCEL_MAX: 100 * 1024 * 1024,
  /** Maximum source code file size (20MB) */
  SOURCE_CODE_MAX: 20 * 1024 * 1024,
  /** Maximum JSON file size (20MB) */
  JSON_MAX: 20 * 1024 * 1024,
  /** Maximum YAML file size (20MB) */
  YAML_MAX: 20 * 1024 * 1024,
  /** Maximum XML file size (20MB) */
  XML_MAX: 20 * 1024 * 1024,
  /** Maximum video file size (500MB) */
  VIDEO_MAX: 500 * 1024 * 1024,
  /** Maximum audio file size (500MB) */
  AUDIO_MAX: 500 * 1024 * 1024,
  /** Maximum archive file size (200MB) */
  ARCHIVE_MAX: 200 * 1024 * 1024,
  /** Maximum general file size (200MB) */
  GENERAL_MAX: 200 * 1024 * 1024,
} as const;

// =============================================================================
// PROCESSING LIMITS
// =============================================================================

/**
 * Processing limits for different content types
 */
export const PROCESSING_LIMITS = {
  /** Maximum lines for source code files */
  MAX_SOURCE_CODE_LINES: 10000,
  /** Maximum lines for text files */
  MAX_TEXT_LINES: 10000,
  /** Maximum characters for text extraction */
  MAX_TEXT_LENGTH: 1000000,
  /** Maximum rows for CSV files */
  MAX_CSV_ROWS: 10000,
  /** Maximum rows per Excel sheet */
  MAX_EXCEL_ROWS: 5000,
  /** Maximum sheets to process in Excel */
  MAX_EXCEL_SHEETS: 10,
  /** Maximum pages for PDF files */
  MAX_PDF_PAGES: 100,
  /** Maximum depth for JSON/YAML objects */
  MAX_OBJECT_DEPTH: 50,
  /** Maximum array length in JSON/YAML */
  MAX_ARRAY_LENGTH: 10000,
} as const;

// =============================================================================
// ARCHIVE LIMITS (Security)
// =============================================================================

/**
 * Security limits for archive processing (ZIP bomb protection)
 */
export const ARCHIVE_LIMITS = {
  /** Maximum decompressed size (100MB) */
  MAX_DECOMPRESSED_SIZE: 100 * 1024 * 1024,
  /** Maximum compression ratio (100:1) */
  MAX_COMPRESSION_RATIO: 100,
  /** Maximum entries in archive */
  MAX_ENTRIES: 1000,
  /** Maximum nesting depth */
  MAX_NESTING_DEPTH: 5,
} as const;

// =============================================================================
// YAML SECURITY LIMITS
// =============================================================================

/**
 * Security limits for YAML processing (billion laughs protection)
 */
export const YAML_LIMITS = {
  /** Maximum alias expansion count */
  MAX_ALIAS_COUNT: 100,
  /** Maximum document count in multi-doc YAML */
  MAX_DOCUMENTS: 10,
  /** Maximum anchor references */
  MAX_ANCHORS: 100,
} as const;

// =============================================================================
// COMBINED SIZE LIMITS
// =============================================================================

/**
 * All size limits combined for backward compatibility
 */
export const SIZE_LIMITS = {
  // MB limits
  IMAGE_MAX_MB: SIZE_LIMITS_MB.IMAGE_MAX_MB,
  PDF_MAX_MB: SIZE_LIMITS_MB.PDF_MAX_MB,
  DOCUMENT_MAX_MB: SIZE_LIMITS_MB.DOCUMENT_MAX_MB,
  WORD_MAX_MB: SIZE_LIMITS_MB.WORD_MAX_MB,
  TEXT_MAX_MB: SIZE_LIMITS_MB.TEXT_MAX_MB,
  CSV_MAX_MB: SIZE_LIMITS_MB.CSV_MAX_MB,
  EXCEL_MAX_MB: SIZE_LIMITS_MB.EXCEL_MAX_MB,
  SOURCE_CODE_MAX_MB: SIZE_LIMITS_MB.SOURCE_CODE_MAX_MB,

  // Byte limits
  MAX_FILE_SIZE: SIZE_LIMITS_BYTES.GENERAL_MAX,
  MAX_IMAGE_SIZE: SIZE_LIMITS_BYTES.IMAGE_MAX,
  MAX_TEXT_SIZE: SIZE_LIMITS_BYTES.TEXT_MAX,

  // Processing limits
  MAX_SOURCE_CODE_LINES: PROCESSING_LIMITS.MAX_SOURCE_CODE_LINES,
  MAX_TEXT_LINES: PROCESSING_LIMITS.MAX_TEXT_LINES,
  MAX_TEXT_LENGTH: PROCESSING_LIMITS.MAX_TEXT_LENGTH,
  MAX_CSV_ROWS: PROCESSING_LIMITS.MAX_CSV_ROWS,
  EXCEL_MAX_ROWS: PROCESSING_LIMITS.MAX_EXCEL_ROWS,
  EXCEL_MAX_SHEETS: PROCESSING_LIMITS.MAX_EXCEL_SHEETS,
  MAX_PDF_PAGES: PROCESSING_LIMITS.MAX_PDF_PAGES,

  // Archive limits
  MAX_DECOMPRESSED_SIZE: ARCHIVE_LIMITS.MAX_DECOMPRESSED_SIZE,
  MAX_COMPRESSION_RATIO: ARCHIVE_LIMITS.MAX_COMPRESSION_RATIO,
  MAX_ZIP_ENTRIES: ARCHIVE_LIMITS.MAX_ENTRIES,

  // YAML limits
  YAML_MAX_ALIAS_COUNT: YAML_LIMITS.MAX_ALIAS_COUNT,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Converts bytes to megabytes
 *
 * @param bytes - Size in bytes
 * @returns Size in megabytes
 */
export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

/**
 * Converts megabytes to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Formats bytes to human-readable string
 *
 * @param bytes - Size in bytes
 * @param precision - Decimal places (default: 2)
 * @returns Formatted string like "1.5 MB" or "500 KB"
 */
export function formatBytes(bytes: number, precision = 2): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(precision))} ${sizes[i]}`;
}

/**
 * Checks if a file size is within the specified limit
 *
 * @param sizeInBytes - File size in bytes
 * @param limitKey - Key from SIZE_LIMITS_BYTES
 * @returns True if the file size is within the limit
 */
export function isWithinSizeLimit(
  sizeInBytes: number,
  limitKey: keyof typeof SIZE_LIMITS_BYTES,
): boolean {
  return sizeInBytes <= SIZE_LIMITS_BYTES[limitKey];
}

/**
 * Gets the appropriate size limit for a file type
 *
 * @param fileType - Type of file (image, pdf, document, etc.)
 * @returns Size limit in bytes
 */
export function getSizeLimitForType(
  fileType:
    | "image"
    | "pdf"
    | "document"
    | "text"
    | "csv"
    | "excel"
    | "code"
    | "json"
    | "yaml"
    | "xml",
): number {
  const limitMap: Record<string, number> = {
    image: SIZE_LIMITS_BYTES.IMAGE_MAX,
    pdf: SIZE_LIMITS_BYTES.PDF_MAX,
    document: SIZE_LIMITS_BYTES.DOCUMENT_MAX,
    text: SIZE_LIMITS_BYTES.TEXT_MAX,
    csv: SIZE_LIMITS_BYTES.CSV_MAX,
    excel: SIZE_LIMITS_BYTES.EXCEL_MAX,
    code: SIZE_LIMITS_BYTES.SOURCE_CODE_MAX,
    json: SIZE_LIMITS_BYTES.JSON_MAX,
    yaml: SIZE_LIMITS_BYTES.YAML_MAX,
    xml: SIZE_LIMITS_BYTES.XML_MAX,
  };

  return limitMap[fileType] || SIZE_LIMITS_BYTES.GENERAL_MAX;
}

/**
 * Validates file size against the appropriate limit
 *
 * @param sizeInBytes - File size in bytes
 * @param fileType - Type of file
 * @returns Object with isValid flag and error message if invalid
 */
export function validateFileSize(
  sizeInBytes: number,
  fileType:
    | "image"
    | "pdf"
    | "document"
    | "text"
    | "csv"
    | "excel"
    | "code"
    | "json"
    | "yaml"
    | "xml",
): { isValid: boolean; error?: string } {
  const limit = getSizeLimitForType(fileType);

  if (sizeInBytes <= limit) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: `File size (${formatBytes(sizeInBytes)}) exceeds the maximum allowed size of ${formatBytes(limit)} for ${fileType} files.`,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Type for SIZE_LIMITS_MB keys */
export type SizeLimitMBKey = keyof typeof SIZE_LIMITS_MB;

/** Type for SIZE_LIMITS_BYTES keys */
export type SizeLimitBytesKey = keyof typeof SIZE_LIMITS_BYTES;

/** Type for PROCESSING_LIMITS keys */
export type ProcessingLimitKey = keyof typeof PROCESSING_LIMITS;

/** Type for the SIZE_LIMITS object */
export type SizeLimits = typeof SIZE_LIMITS;
