/**
 * File Processing Error Codes
 *
 * Comprehensive error codes for file processing operations including:
 * - Download operations (timeout, auth, network)
 * - File validation (size, type, format)
 * - Content processing (parsing, encoding, extraction)
 * - Security validation (XXE, XSS, zip bombs)
 * - System errors
 *
 * @module processors/errors
 */

/**
 * Enumeration of all file processing error codes.
 * Each code represents a specific failure scenario with associated messaging.
 */
export enum FileErrorCode {
  // ============================================================================
  // DOWNLOAD ERRORS
  // ============================================================================

  /** File download failed due to network or server error */
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",

  /** Download operation exceeded timeout threshold */
  DOWNLOAD_TIMEOUT = "DOWNLOAD_TIMEOUT",

  /** Authentication failed when accessing the file */
  DOWNLOAD_AUTH_FAILED = "DOWNLOAD_AUTH_FAILED",

  /** Network error during download (connection reset, DNS failure, etc.) */
  NETWORK_ERROR = "NETWORK_ERROR",

  /** File was not found at the specified location */
  FILE_NOT_FOUND = "FILE_NOT_FOUND",

  /** Request was rate limited by the server */
  RATE_LIMITED = "RATE_LIMITED",

  // ============================================================================
  // VALIDATION ERRORS
  // ============================================================================

  /** File exceeds maximum allowed size */
  FILE_TOO_LARGE = "FILE_TOO_LARGE",

  /** File type is not supported for processing */
  UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE",

  /** File format is invalid or malformed */
  INVALID_FORMAT = "INVALID_FORMAT",

  /** File MIME type doesn't match expected format */
  INVALID_MIME_TYPE = "INVALID_MIME_TYPE",

  /** File magic bytes don't match expected file type */
  INVALID_MAGIC_BYTES = "INVALID_MAGIC_BYTES",

  /** File appears to be corrupted or damaged */
  CORRUPTED_FILE = "CORRUPTED_FILE",

  /** File internal structure is invalid */
  INVALID_STRUCTURE = "INVALID_STRUCTURE",

  // ============================================================================
  // PROCESSING ERRORS
  // ============================================================================

  /** Generic processing failure */
  PROCESSING_FAILED = "PROCESSING_FAILED",

  /** Failed to parse file content */
  PARSING_FAILED = "PARSING_FAILED",

  /** Text encoding error (not UTF-8, BOM issues, etc.) */
  ENCODING_ERROR = "ENCODING_ERROR",

  /** Failed to extract content from file */
  EXTRACTION_FAILED = "EXTRACTION_FAILED",

  /** Failed to decompress file content */
  DECOMPRESSION_FAILED = "DECOMPRESSION_FAILED",

  // ============================================================================
  // SECURITY ERRORS
  // ============================================================================

  /** Security validation failed */
  SECURITY_VALIDATION_FAILED = "SECURITY_VALIDATION_FAILED",

  /** XML External Entity (XXE) attack detected */
  XXE_DETECTED = "XXE_DETECTED",

  /** Cross-site scripting (XSS) attack detected */
  XSS_DETECTED = "XSS_DETECTED",

  /** Potentially malicious code execution detected */
  CODE_EXECUTION_DETECTED = "CODE_EXECUTION_DETECTED",

  /** Zip bomb or decompression bomb detected */
  ZIP_BOMB_DETECTED = "ZIP_BOMB_DETECTED",

  // ============================================================================
  // SYSTEM ERRORS
  // ============================================================================

  /** Unknown or unexpected error */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Error message template with user-friendly messaging and retry information.
 */
export type ErrorMessageTemplate = {
  /** Technical error message */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Suggested action to resolve the error */
  suggestedAction: string;
  /** Whether this error is potentially retryable */
  retryable: boolean;
};

/**
 * Error messages map with technical and user-friendly messaging for each error code.
 * All messages are designed to be clear, actionable, and free of technical jargon.
 */
export const ERROR_MESSAGES: Record<FileErrorCode, ErrorMessageTemplate> = {
  // Download errors
  [FileErrorCode.DOWNLOAD_FAILED]: {
    message: "Failed to download the file from the source.",
    userMessage: "We couldn't download your file.",
    suggestedAction:
      "Please try uploading the file again. If the problem persists, the file may have been deleted or access revoked.",
    retryable: true,
  },

  [FileErrorCode.DOWNLOAD_TIMEOUT]: {
    message: "File download timed out.",
    userMessage: "The download took too long and was cancelled.",
    suggestedAction:
      "This usually happens with very large files or slow connections. Try re-uploading a smaller version or check your network connection.",
    retryable: true,
  },

  [FileErrorCode.DOWNLOAD_AUTH_FAILED]: {
    message: "Authentication failed when accessing the file.",
    userMessage: "We don't have permission to access this file.",
    suggestedAction:
      "Please check the file permissions and ensure it's accessible, then try again.",
    retryable: false,
  },

  [FileErrorCode.NETWORK_ERROR]: {
    message: "Network error while downloading the file.",
    userMessage: "A network error occurred while downloading.",
    suggestedAction:
      "This is usually temporary. Please try uploading the file again.",
    retryable: true,
  },

  [FileErrorCode.FILE_NOT_FOUND]: {
    message: "The file could not be found at the specified location.",
    userMessage: "The file could not be found.",
    suggestedAction:
      "The file may have been moved or deleted. Please re-upload the file.",
    retryable: false,
  },

  [FileErrorCode.RATE_LIMITED]: {
    message: "Request was rate limited by the server.",
    userMessage: "Too many requests in a short time.",
    suggestedAction: "Please wait a few seconds and try again.",
    retryable: true,
  },

  // Validation errors
  [FileErrorCode.FILE_TOO_LARGE]: {
    message: "File exceeds the maximum allowed size.",
    userMessage: "This file is too large to process.",
    suggestedAction:
      "Try compressing the file or splitting it into smaller parts. Consider reducing image quality or removing unnecessary content.",
    retryable: false,
  },

  [FileErrorCode.UNSUPPORTED_TYPE]: {
    message: "The file type is not supported for processing.",
    userMessage: "This file type is not supported.",
    suggestedAction:
      "Please convert your file to a supported format and try again.",
    retryable: false,
  },

  [FileErrorCode.INVALID_FORMAT]: {
    message: "The file format is invalid or malformed.",
    userMessage: "This file appears to be in an invalid format.",
    suggestedAction:
      "Please ensure the file is properly saved and not corrupted, then try again.",
    retryable: false,
  },

  [FileErrorCode.INVALID_MIME_TYPE]: {
    message: "File MIME type doesn't match the expected format.",
    userMessage: "The file type doesn't match its extension.",
    suggestedAction:
      "Please ensure the file extension matches its actual content type and try again.",
    retryable: false,
  },

  [FileErrorCode.INVALID_MAGIC_BYTES]: {
    message: "File magic bytes don't match the expected file type.",
    userMessage:
      "This file doesn't appear to be a valid file of the expected type.",
    suggestedAction:
      "The file may be corrupted or saved in the wrong format. Try re-saving the file in the correct format.",
    retryable: true,
  },

  [FileErrorCode.CORRUPTED_FILE]: {
    message: "File appears to be corrupted or damaged.",
    userMessage: "This file appears to be corrupted or invalid.",
    suggestedAction:
      "The file structure is invalid. Try re-downloading from the original source or re-creating the file.",
    retryable: false,
  },

  [FileErrorCode.INVALID_STRUCTURE]: {
    message: "File internal structure is invalid.",
    userMessage: "The file has an invalid internal structure.",
    suggestedAction:
      "The file format is correct but the content is malformed. Try validating the file with a format checker or re-exporting from the original application.",
    retryable: false,
  },

  // Processing errors
  [FileErrorCode.PROCESSING_FAILED]: {
    message: "Failed to process the file content.",
    userMessage: "We couldn't process this file.",
    suggestedAction:
      "Please try again. If the problem persists, the file may be in an unsupported variant.",
    retryable: true,
  },

  [FileErrorCode.PARSING_FAILED]: {
    message: "Failed to parse the file content.",
    userMessage: "We couldn't read the contents of this file.",
    suggestedAction:
      "The file structure may be invalid. Try validating the file with a format checker or re-creating the file.",
    retryable: false,
  },

  [FileErrorCode.ENCODING_ERROR]: {
    message: "Text encoding error detected.",
    userMessage: "We couldn't decode the text in this file.",
    suggestedAction:
      "Try re-saving the file with UTF-8 encoding. Most modern text editors have this option in 'Save As' settings.",
    retryable: false,
  },

  [FileErrorCode.EXTRACTION_FAILED]: {
    message: "Failed to extract content from the file.",
    userMessage: "We couldn't extract the content from this file.",
    suggestedAction:
      "The file may be password-protected, corrupted, or use an unsupported variant. Try re-saving without protection.",
    retryable: false,
  },

  [FileErrorCode.DECOMPRESSION_FAILED]: {
    message: "Failed to decompress the file content.",
    userMessage: "We couldn't decompress this file.",
    suggestedAction:
      "The file may be corrupted or use an unsupported compression method. Try re-uploading or using a different file format.",
    retryable: true,
  },

  // Security errors
  [FileErrorCode.SECURITY_VALIDATION_FAILED]: {
    message: "File failed security validation.",
    userMessage:
      "This file contains content that is blocked for security reasons.",
    suggestedAction:
      "Please remove the problematic content and try again. If you believe this is a legitimate file, please contact support.",
    retryable: false,
  },

  [FileErrorCode.XXE_DETECTED]: {
    message: "XML External Entity (XXE) attack pattern detected.",
    userMessage:
      "This XML file contains DOCTYPE or ENTITY declarations that could pose security risks.",
    suggestedAction:
      "Please remove DOCTYPE and ENTITY declarations from the XML file. Most XML files don't need these for basic data storage.",
    retryable: false,
  },

  [FileErrorCode.XSS_DETECTED]: {
    message: "Cross-site scripting (XSS) attack pattern detected.",
    userMessage:
      "This file contains script tags or event handlers that could pose security risks.",
    suggestedAction:
      "Please remove <script> tags and event handlers (onclick, onerror, etc.) from the file.",
    retryable: false,
  },

  [FileErrorCode.CODE_EXECUTION_DETECTED]: {
    message: "Potentially malicious code execution pattern detected.",
    userMessage: "This file contains code execution tags that are not allowed.",
    suggestedAction:
      "Please remove custom object/function tags and use standard data structures only.",
    retryable: false,
  },

  [FileErrorCode.ZIP_BOMB_DETECTED]: {
    message: "Zip bomb or decompression bomb pattern detected.",
    userMessage:
      "This file has an unusually high compression ratio that could indicate a security threat.",
    suggestedAction:
      "If this is a legitimate file, try re-saving it without extreme compression. Otherwise, please verify the file source.",
    retryable: false,
  },

  // System errors
  [FileErrorCode.UNKNOWN_ERROR]: {
    message: "An unexpected error occurred.",
    userMessage: "An unexpected error occurred while processing your file.",
    suggestedAction:
      "Please try again. If the problem persists, contact support.",
    retryable: true,
  },
};

/**
 * Get the error message template for a specific error code.
 *
 * @param code - The FileErrorCode to get the template for
 * @returns The ErrorMessageTemplate for the given code
 */
export function getErrorTemplate(code: FileErrorCode): ErrorMessageTemplate {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[FileErrorCode.UNKNOWN_ERROR];
}

/**
 * Check if an error code represents a retryable error.
 *
 * @param code - The FileErrorCode to check
 * @returns true if the error is retryable
 */
export function isRetryableErrorCode(code: FileErrorCode): boolean {
  return ERROR_MESSAGES[code]?.retryable ?? false;
}
