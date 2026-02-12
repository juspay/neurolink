/**
 * Base File Processor Abstract Class
 *
 * Provides common functionality for downloading, validating, and processing files
 * from any source (URLs, buffers, cloud storage, etc.)
 *
 * This class uses the Template Method pattern to provide a consistent processing
 * pipeline while allowing subclasses to customize specific steps.
 *
 * Key features:
 * - Support for both URL downloads and direct buffer input
 * - Configurable retry with exponential backoff
 * - Gzip decompression support
 * - Structured error handling with user-friendly messages
 * - File type validation by MIME type and extension
 * - Size limit enforcement
 *
 * @module processors/base/BaseFileProcessor
 *
 * @example
 * ```typescript
 * class ImageProcessor extends BaseFileProcessor<ProcessedImage> {
 *   constructor() {
 *     super({
 *       maxSizeMB: 10,
 *       timeoutMs: 30000,
 *       supportedMimeTypes: ['image/jpeg', 'image/png'],
 *       supportedExtensions: ['.jpg', '.jpeg', '.png'],
 *       fileTypeName: 'image',
 *       defaultFilename: 'image.jpg',
 *     });
 *   }
 *
 *   protected buildProcessedResult(buffer: Buffer, fileInfo: FileInfo): ProcessedImage {
 *     return {
 *       buffer,
 *       mimetype: fileInfo.mimetype,
 *       size: buffer.length,
 *       filename: this.getFilename(fileInfo),
 *       // ... additional image-specific fields
 *     };
 *   }
 * }
 * ```
 */

import { promisify } from "util";
import { gunzip } from "zlib";

import { SIZE_LIMITS } from "../config/index.js";
import {
  createFileError,
  extractHttpStatus,
  FileErrorCode,
  isRetryableError,
} from "../errors/index.js";

import type {
  BatchProcessingSummary,
  FailedFileInfo,
  FileInfo,
  FileProcessingError,
  FileProcessingResult,
  FileProcessorConfig,
  FileWarning,
  OperationResult,
  ProcessedFileBase,
  ProcessedFileInfo,
  ProcessOptions,
  SkippedFileInfo,
} from "./types.js";
import { DEFAULT_RETRY_CONFIG } from "./types.js";

const gunzipAsync = promisify(gunzip);

/**
 * Abstract base class for file processors.
 * Provides common download, validation, and error handling functionality.
 *
 * @typeParam T - The type of processed result, must extend ProcessedFileBase
 */
export abstract class BaseFileProcessor<T extends ProcessedFileBase> {
  /** Processor configuration */
  protected readonly config: FileProcessorConfig;

  /**
   * Creates a new file processor with the given configuration.
   *
   * @param config - Processor configuration
   */
  constructor(config: FileProcessorConfig) {
    this.config = config;
  }

  /**
   * Get the processor configuration.
   * Provides read-only access to processor config for external consumers
   * (e.g., ProcessorRegistry, FileProcessorIntegration) without requiring
   * unsafe casts to access the protected field.
   *
   * @returns Readonly processor configuration
   */
  public getConfig(): Readonly<FileProcessorConfig> {
    return this.config;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Process a single file.
   * Main entry point - implements the Template Method pattern.
   *
   * @param fileInfo - File information (can include URL or buffer)
   * @param options - Optional processing options (auth headers, timeout, retry config)
   * @returns Processing result with success flag and either data or error
   *
   * @example
   * ```typescript
   * const result = await processor.processFile(fileInfo, {
   *   authHeaders: { 'Authorization': 'Bearer token' },
   *   timeout: 60000,
   * });
   *
   * if (result.success) {
   *   console.log('Processed:', result.data.filename);
   * } else {
   *   console.error('Failed:', result.error.userMessage);
   * }
   * ```
   */
  async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<FileProcessingResult<T>> {
    try {
      // Step 1: Validate file type and size
      const validationResult = this.validateFileWithResult(fileInfo);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Step 2: Get file buffer (from direct buffer or download from URL)
      let buffer: Buffer;

      if (fileInfo.buffer) {
        // Direct buffer provided - skip download
        buffer = fileInfo.buffer;
      } else if (fileInfo.url) {
        // Download from URL
        const downloadResult = await this.downloadFileWithRetry(
          fileInfo,
          options,
        );
        if (!downloadResult.success) {
          return {
            success: false,
            error: downloadResult.error,
          };
        }
        if (!downloadResult.data) {
          return {
            success: false,
            error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
              reason: "Download succeeded but returned no data",
            }),
          };
        }
        buffer = downloadResult.data;

        // Validate actual downloaded size against limit
        if (!this.validateFileSize(buffer.length)) {
          return {
            success: false,
            error: this.createError(FileErrorCode.FILE_TOO_LARGE, {
              sizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
              maxMB: this.config.maxSizeMB,
              type: this.config.fileTypeName,
            }),
          };
        }
      } else {
        // No buffer or URL provided
        return {
          success: false,
          error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
            reason: "No buffer or URL provided for file",
          }),
        };
      }

      // Step 3: Post-download validation (subclasses can override)
      const postValidationResult = await this.validateDownloadedFileWithResult(
        buffer,
        fileInfo,
      );
      if (!postValidationResult.success) {
        return {
          success: false,
          error: postValidationResult.error,
        };
      }

      // Step 4: Build processed result using template method
      return await this.buildProcessedResultWithResult(buffer, fileInfo);
    } catch (error) {
      // Catch any unexpected errors
      return {
        success: false,
        error: this.createError(
          FileErrorCode.UNKNOWN_ERROR,
          { error: error instanceof Error ? error.message : String(error) },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Process multiple files with detailed summary.
   *
   * @param fileIds - Array of file IDs to process
   * @param getFileInfo - Function to retrieve file info by ID
   * @param options - Optional processing options
   * @returns Summary with processed, failed, and skipped files
   *
   * @example
   * ```typescript
   * const summary = await processor.processFiles(
   *   ['file1', 'file2', 'file3'],
   *   async (id) => await fetchFileInfo(id),
   *   { authHeaders: { 'Authorization': 'Bearer token' } }
   * );
   *
   * console.log(`Success: ${summary.processedFiles.length}`);
   * console.log(`Failed: ${summary.failedFiles.length}`);
   * ```
   */
  async processFiles(
    fileIds: string[],
    getFileInfo: (id: string) => Promise<FileInfo | null>,
    options?: ProcessOptions,
  ): Promise<BatchProcessingSummary<T>> {
    const results: T[] = [];
    const processedFiles: ProcessedFileInfo[] = [];
    const failedFiles: FailedFileInfo[] = [];
    const skippedFiles: SkippedFileInfo[] = [];
    const warnings: FileWarning[] = [];

    for (const fileId of fileIds) {
      const fileInfo = await getFileInfo(fileId);

      if (!fileInfo) {
        failedFiles.push({
          fileId,
          filename: "unknown",
          mimetype: "unknown",
          size: 0,
          error: this.createError(FileErrorCode.FILE_NOT_FOUND),
        });
        continue;
      }

      const result = await this.processFile(fileInfo, options);

      if (result.success && result.data) {
        results.push(result.data);
        processedFiles.push({
          fileId: fileInfo.id,
          filename: fileInfo.name || "unknown",
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          processorType: this.config.fileTypeName,
        });
      } else if (result.error) {
        // Check if this is a "skipped" case vs hard failure
        if (result.error.code === FileErrorCode.UNSUPPORTED_TYPE) {
          skippedFiles.push({
            fileId: fileInfo.id,
            filename: fileInfo.name || "unknown",
            mimetype: fileInfo.mimetype,
            size: fileInfo.size,
            reason: result.error.message,
          });
        } else {
          failedFiles.push({
            fileId: fileInfo.id,
            filename: fileInfo.name || "unknown",
            mimetype: fileInfo.mimetype,
            size: fileInfo.size,
            error: result.error,
          });
        }
      }
    }

    return {
      totalFiles: fileIds.length,
      processedFiles,
      failedFiles,
      skippedFiles,
      warnings,
      results,
    };
  }

  /**
   * Check if a file is supported by this processor.
   *
   * @param mimetype - MIME type of the file
   * @param filename - Filename (for extension-based detection)
   * @returns true if the file type is supported
   *
   * @example
   * ```typescript
   * if (processor.isFileSupported('image/jpeg', 'photo.jpg')) {
   *   // Process the file
   * }
   * ```
   */
  public isFileSupported(mimetype: string, filename: string): boolean {
    return (
      this.isSupportedMimeType(mimetype) || this.isSupportedExtension(filename)
    );
  }

  // ===========================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ===========================================================================

  /**
   * Build the processed result object.
   * Subclasses must implement this to create their specific result type.
   *
   * @param buffer - Downloaded/provided file content
   * @param fileInfo - Original file information
   * @returns Processed result object
   */
  protected abstract buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): T | Promise<T>;

  // ===========================================================================
  // PROTECTED METHODS - Can be overridden by subclasses
  // ===========================================================================

  /**
   * Validate downloaded file buffer.
   * Override for custom post-download validation (e.g., magic bytes).
   *
   * @param _buffer - Downloaded file content
   * @param _fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected async validateDownloadedFile(
    _buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    return null; // No validation by default
  }

  /**
   * Validate downloaded file buffer with structured error result.
   * Override for custom post-download validation with detailed errors.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Success result or error result
   */
  protected async validateDownloadedFileWithResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): Promise<OperationResult<void>> {
    // Call the legacy validation method for backward compatibility
    const errorMessage = await this.validateDownloadedFile(buffer, fileInfo);
    if (errorMessage) {
      return {
        success: false,
        error: this.createError(FileErrorCode.INVALID_FORMAT, {
          reason: errorMessage,
        }),
      };
    }
    return { success: true, data: undefined };
  }

  /**
   * Build processed result with structured error handling.
   * Override for custom result building that can fail with errors.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Success result with data or error result
   */
  protected async buildProcessedResultWithResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): Promise<FileProcessingResult<T>> {
    try {
      const result = await this.buildProcessedResult(buffer, fileInfo);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: this.createError(
          FileErrorCode.PROCESSING_FAILED,
          { fileType: this.config.fileTypeName },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Get filename with default fallback.
   *
   * @param fileInfo - File information
   * @returns Filename or default if not available
   */
  protected getFilename(fileInfo: FileInfo): string {
    return fileInfo.name || this.config.defaultFilename;
  }

  // ===========================================================================
  // DOWNLOAD METHODS
  // ===========================================================================

  /**
   * Download file from URL with authentication.
   *
   * @param url - URL to download from
   * @param authHeaders - Optional authentication headers
   * @param timeout - Optional timeout override
   * @returns Downloaded file content as Buffer
   * @throws Error if download fails
   */
  protected async downloadFile(
    url: string,
    authHeaders?: Record<string, string>,
    timeout?: number,
  ): Promise<Buffer> {
    // Note: We intentionally use AbortController + setTimeout here rather than the shared
    // withTimeout utility. AbortController.signal cancels the actual HTTP request via
    // fetch's signal option, while withTimeout only races promises and would leave
    // the fetch running in the background, consuming network resources.
    const controller = new AbortController();
    const effectiveTimeout = timeout ?? this.config.timeoutMs;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, effectiveTimeout);

    try {
      const headers: Record<string, string> = {
        ...authHeaders,
      };

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Reject HTML responses - likely an error page or redirect
      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error(
          `Received HTML response instead of file content (Content-Type: ${contentType}). This usually means the download URL returned an error page.`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Check for gzip encoding and decompress if needed
      // Only decompress if the data actually starts with gzip magic bytes (0x1f 0x8b)
      const contentEncoding = response.headers.get("Content-Encoding");
      const isActuallyGzipped =
        buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;

      if (
        contentEncoding?.toLowerCase().includes("gzip") &&
        isActuallyGzipped
      ) {
        try {
          buffer = Buffer.from(await gunzipAsync(buffer));
        } catch (gzipError) {
          throw new Error(
            `Failed to decompress gzip response: ${gzipError instanceof Error ? gzipError.message : String(gzipError)}`,
          );
        }
      }

      return buffer;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Download file with retry logic for transient failures.
   *
   * @param fileInfo - File information with URL
   * @param options - Processing options including auth headers and retry config
   * @returns Success result with buffer or error result
   */
  protected async downloadFileWithRetry(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<OperationResult<Buffer>> {
    const url = fileInfo.url;
    if (!url) {
      return {
        success: false,
        error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
          reason: "No URL provided for download",
        }),
      };
    }

    const retryConfig = options?.retryConfig ?? DEFAULT_RETRY_CONFIG;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const buffer = await this.downloadFile(
          url,
          options?.authHeaders,
          options?.timeout,
        );
        return { success: true, data: buffer };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          attempt < retryConfig.maxRetries &&
          (retryConfig.retryOn
            ? retryConfig.retryOn(lastError)
            : isRetryableError(lastError));

        if (shouldRetry) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            retryConfig.baseDelayMs * 2 ** attempt,
            retryConfig.maxDelayMs,
          );
          await this.sleep(delay);
          continue;
        }

        // No more retries, return error
        break;
      }
    }

    // Classify the final error
    return {
      success: false,
      error: this.classifyDownloadError(lastError as Error),
    };
  }

  // ===========================================================================
  // VALIDATION METHODS
  // ===========================================================================

  /**
   * Validate file type and size with structured error result.
   *
   * @param fileInfo - File information to validate
   * @returns Success result or error result
   */
  protected validateFileWithResult(fileInfo: FileInfo): OperationResult<void> {
    // Validate file type
    if (!this.isFileSupported(fileInfo.mimetype, fileInfo.name || "")) {
      return {
        success: false,
        error: this.createError(FileErrorCode.UNSUPPORTED_TYPE, {
          format:
            fileInfo.mimetype || fileInfo.name?.split(".").pop() || "unknown",
          supportedFormats:
            this.config.supportedMimeTypes.length > 0
              ? this.config.supportedMimeTypes.join(", ")
              : this.config.supportedExtensions.join(", "),
          type: this.config.fileTypeName,
        }),
      };
    }

    // Validate size
    if (!this.validateFileSize(fileInfo.size)) {
      const sizeMB = this.formatSizeMB(fileInfo.size);
      return {
        success: false,
        error: this.createError(FileErrorCode.FILE_TOO_LARGE, {
          sizeMB,
          maxMB: this.config.maxSizeMB,
          type: this.config.fileTypeName,
        }),
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Validate file size against configured maximum.
   *
   * @param sizeBytes - File size in bytes
   * @returns true if size is within limits
   */
  protected validateFileSize(sizeBytes: number): boolean {
    const maxBytes = this.config.maxSizeMB * 1024 * 1024;
    return sizeBytes <= maxBytes;
  }

  /**
   * Check if file matches supported MIME types.
   *
   * @param mimetype - MIME type to check
   * @returns true if MIME type is supported
   */
  protected isSupportedMimeType(mimetype: string): boolean {
    if (!mimetype) {
      return false;
    }
    return this.config.supportedMimeTypes.includes(mimetype.toLowerCase());
  }

  /**
   * Check if file matches supported extensions.
   *
   * @param filename - Filename to check
   * @returns true if extension is supported
   */
  protected isSupportedExtension(filename: string): boolean {
    if (!filename) {
      return false;
    }
    const lowerFilename = filename.toLowerCase();
    return this.config.supportedExtensions.some((ext) =>
      lowerFilename.endsWith(ext),
    );
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Format file size in MB with 2 decimal places.
   *
   * @param sizeBytes - Size in bytes
   * @returns Formatted size string
   */
  protected formatSizeMB(sizeBytes: number): string {
    return (sizeBytes / (1024 * 1024)).toFixed(2);
  }

  /**
   * Create a structured file processing error.
   *
   * @param code - Error code
   * @param details - Additional error details
   * @param originalError - Original error that caused this
   * @returns Structured error object
   */
  protected createError(
    code: FileErrorCode,
    details?: Record<string, unknown>,
    originalError?: Error,
  ): FileProcessingError {
    return createFileError(code, details, originalError);
  }

  /**
   * Classify a download error into appropriate error code.
   *
   * @param error - The error to classify
   * @returns Structured file processing error
   */
  protected classifyDownloadError(error: Error): FileProcessingError {
    if (error.name === "AbortError") {
      return this.createError(
        FileErrorCode.DOWNLOAD_TIMEOUT,
        { timeoutMs: this.config.timeoutMs },
        error,
      );
    }

    if (error.message.includes("HTTP")) {
      const status = extractHttpStatus(error);
      if (status === 404) {
        return this.createError(FileErrorCode.FILE_NOT_FOUND, {}, error);
      }
      if (status === 401 || status === 403) {
        return this.createError(
          FileErrorCode.DOWNLOAD_AUTH_FAILED,
          { httpStatus: status },
          error,
        );
      }
      if (status === 429) {
        return this.createError(FileErrorCode.RATE_LIMITED, {}, error);
      }
      return this.createError(
        FileErrorCode.NETWORK_ERROR,
        { httpStatus: status },
        error,
      );
    }

    if (error.message.includes("decompress")) {
      return this.createError(FileErrorCode.DECOMPRESSION_FAILED, {}, error);
    }

    return this.createError(FileErrorCode.DOWNLOAD_FAILED, {}, error);
  }

  /**
   * Sleep for specified milliseconds.
   *
   * @param ms - Milliseconds to sleep
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Get the default text file download timeout.
 *
 * @returns Timeout in milliseconds
 */
export function getDefaultTextTimeout(): number {
  // Return a sensible default since we don't have env config
  return 30000;
}

/**
 * Get the default image download timeout.
 *
 * @returns Timeout in milliseconds
 */
export function getDefaultImageTimeout(): number {
  return 30000;
}

/**
 * Get the default text file max size in MB.
 *
 * @returns Max size in megabytes
 */
export function getDefaultTextMaxSizeMB(): number {
  return SIZE_LIMITS.TEXT_MAX_MB;
}

/**
 * Get the default image max size in MB.
 *
 * @returns Max size in megabytes
 */
export function getDefaultImageMaxSizeMB(): number {
  return SIZE_LIMITS.IMAGE_MAX_MB;
}
