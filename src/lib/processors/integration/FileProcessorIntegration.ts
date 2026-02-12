/**
 * File Processor Integration
 *
 * Provides integration between the ProcessorRegistry and message building.
 * This module allows for automatic file type detection and processing
 * using the registered file processors.
 *
 * @module processors/integration/FileProcessorIntegration
 *
 * @example
 * ```typescript
 * import {
 *   processFileWithRegistry,
 *   processBatchWithRegistry,
 *   getSupportedFileTypes,
 *   isFileTypeSupported,
 *   getProcessorForFile,
 * } from "./integration/index.js";
 *
 * // Process a single file
 * const { processorName, result } = await processFileWithRegistry(fileInfo);
 * if (result?.success) {
 *   console.log(`Processed with ${processorName}:`, result.data);
 * }
 *
 * // Process multiple files
 * const batchResult = await processBatchWithRegistry(files, { maxFiles: 50 });
 * console.log(`Successful: ${batchResult.successful.length}`);
 * console.log(`Failed: ${batchResult.failed.length}`);
 * console.log(`Skipped: ${batchResult.skipped.length}`);
 *
 * // Check if a file type is supported
 * if (isFileTypeSupported("application/pdf", "document.pdf")) {
 *   console.log("PDF files are supported");
 * }
 * ```
 */

import { withTimeout } from "../../utils/errorHandling.js";
import type { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessedFileBase,
  ProcessOptions,
  ProcessorMatch,
} from "../base/types.js";
import { getProcessorRegistry } from "../registry/index.js";

// =============================================================================
// PROCESSING OPTIONS
// =============================================================================

/**
 * Options for processing files through the registry.
 * Extends base ProcessOptions with registry-specific options.
 *
 * @example
 * ```typescript
 * const options: FileProcessingOptions = {
 *   // Base options
 *   authHeaders: { Authorization: "Bearer token" },
 *   timeout: 60000,
 *
 *   // Registry-specific options
 *   preferredProcessor: "pdf",      // Use specific processor
 *   allowFallback: true,            // Allow fallback if no processor found
 *   maxFiles: 50,                   // Limit batch processing
 * };
 * ```
 */
export type FileProcessingOptions = ProcessOptions & {
  /** Preferred processor name (bypasses auto-detection) */
  preferredProcessor?: string;
  /** Whether to fall back to default processing if no processor found */
  allowFallback?: boolean;
  /** Maximum number of files to process (default: 100) */
  maxFiles?: number;
};

// =============================================================================
// BATCH PROCESSING RESULT
// =============================================================================

/**
 * Result of processing multiple files through the registry.
 * Categorizes files into successful, failed, and skipped.
 *
 * @example
 * ```typescript
 * const result = await processBatchWithRegistry(files);
 *
 * // Handle successful files
 * for (const { fileInfo, processorName, result } of result.successful) {
 *   console.log(`${fileInfo.name}: processed by ${processorName}`);
 * }
 *
 * // Handle failed files
 * for (const { fileInfo, error } of result.failed) {
 *   console.error(`${fileInfo.name}: ${error}`);
 * }
 *
 * // Handle skipped files
 * for (const { fileInfo, reason } of result.skipped) {
 *   console.warn(`${fileInfo.name}: ${reason}`);
 * }
 * ```
 */
export type BatchFileProcessingResult = {
  /** Successfully processed files */
  successful: Array<{
    fileInfo: FileInfo;
    processorName: string;
    result: FileProcessingResult<ProcessedFileBase>;
  }>;
  /** Files that failed to process */
  failed: Array<{
    fileInfo: FileInfo;
    error: string;
  }>;
  /** Files that were skipped (no processor found or over limit) */
  skipped: Array<{
    fileInfo: FileInfo;
    reason: string;
  }>;
};

// =============================================================================
// SINGLE FILE PROCESSING
// =============================================================================

/**
 * Process a single file using the ProcessorRegistry.
 * Automatically detects the appropriate processor based on MIME type and filename.
 *
 * @param fileInfo - File information including content/URL
 * @param options - Processing options (preferred processor, auth headers, timeout)
 * @returns Object containing processor name (null if none found) and processing result
 *
 * @example
 * ```typescript
 * // Basic usage - auto-detect processor
 * const { processorName, result } = await processFileWithRegistry({
 *   id: "file-123",
 *   name: "document.pdf",
 *   mimetype: "application/pdf",
 *   size: 1024000,
 *   url: "https://example.com/document.pdf",
 * });
 *
 * if (result?.success) {
 *   console.log(`Processed by ${processorName}:`, result.data);
 * }
 *
 * // Use a specific processor
 * const { result } = await processFileWithRegistry(fileInfo, {
 *   preferredProcessor: "pdf",
 * });
 *
 * // With authentication and timeout
 * const { result } = await processFileWithRegistry(fileInfo, {
 *   authHeaders: { Authorization: "Bearer token123" },
 *   timeout: 60000,
 * });
 * ```
 */
export async function processFileWithRegistry(
  fileInfo: FileInfo,
  options?: FileProcessingOptions,
): Promise<{
  processorName: string | null;
  result: FileProcessingResult<ProcessedFileBase> | null;
}> {
  const registry = await getProcessorRegistry();

  const timeout = options?.timeout ?? 30000;

  // Use preferred processor if specified
  if (options?.preferredProcessor) {
    const processor = registry.getProcessor(options.preferredProcessor);
    if (processor) {
      const result = await withTimeout(
        processor.processor.processFile(fileInfo, options),
        timeout,
        new Error(`File processing timed out after ${timeout}ms`),
      );
      return { processorName: options.preferredProcessor, result };
    }
  }

  // Auto-detect processor based on MIME type and filename
  const match = registry.findProcessor(fileInfo.mimetype, fileInfo.name);
  if (!match) {
    return { processorName: null, result: null };
  }

  const processor = match.processor as BaseFileProcessor<ProcessedFileBase>;
  const result = await withTimeout(
    processor.processFile(fileInfo, options),
    timeout,
    new Error(`File processing timed out after ${timeout}ms`),
  );
  return { processorName: match.name, result };
}

// =============================================================================
// BATCH FILE PROCESSING
// =============================================================================

/**
 * Process multiple files using the ProcessorRegistry.
 * Files are processed sequentially and categorized by outcome.
 *
 * @param files - Array of file information objects
 * @param options - Processing options (max files, auth headers, timeout)
 * @returns Batch result with successful, failed, and skipped files
 *
 * @example
 * ```typescript
 * const files: FileInfo[] = [
 *   { id: "1", name: "image.jpg", mimetype: "image/jpeg", size: 512000 },
 *   { id: "2", name: "doc.pdf", mimetype: "application/pdf", size: 1024000 },
 *   { id: "3", name: "unknown.xyz", mimetype: "application/octet-stream", size: 100 },
 * ];
 *
 * const result = await processBatchWithRegistry(files, {
 *   maxFiles: 50,
 *   timeout: 60000,
 * });
 *
 * console.log(`Processed ${result.successful.length} files successfully`);
 * console.log(`Failed: ${result.failed.length}`);
 * console.log(`Skipped: ${result.skipped.length}`);
 *
 * // Access individual results
 * for (const { fileInfo, processorName, result } of result.successful) {
 *   console.log(`${fileInfo.name}: ${result.data?.size} bytes`);
 * }
 * ```
 */
export async function processBatchWithRegistry(
  files: FileInfo[],
  options?: FileProcessingOptions,
): Promise<BatchFileProcessingResult> {
  const result: BatchFileProcessingResult = {
    successful: [],
    failed: [],
    skipped: [],
  };

  const maxFiles = options?.maxFiles ?? 100;
  const filesToProcess = files.slice(0, maxFiles);

  // Process files sequentially
  for (const fileInfo of filesToProcess) {
    try {
      const { processorName, result: processResult } =
        await processFileWithRegistry(fileInfo, options);

      if (!processorName || !processResult) {
        // No processor found for this file type
        if (!options?.allowFallback) {
          result.skipped.push({
            fileInfo,
            reason: `No processor found for MIME type: ${fileInfo.mimetype}`,
          });
        } else {
          // allowFallback is true but no fallback processor implemented yet
          result.skipped.push({
            fileInfo,
            reason: `No processor found for MIME type: ${fileInfo.mimetype} (fallback not yet implemented)`,
          });
        }
        continue;
      }

      if (processResult.success) {
        result.successful.push({
          fileInfo,
          processorName,
          result: processResult,
        });
      } else {
        result.failed.push({
          fileInfo,
          error: processResult.error?.message || "Unknown error",
        });
      }
    } catch (error) {
      result.failed.push({
        fileInfo,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Track skipped files that exceeded the limit
  if (files.length > maxFiles) {
    for (let i = maxFiles; i < files.length; i++) {
      result.skipped.push({
        fileInfo: files[i],
        reason: `Exceeded maximum file limit (${maxFiles})`,
      });
    }
  }

  return result;
}

// =============================================================================
// PROCESSOR DISCOVERY
// =============================================================================

/**
 * Get a list of supported file types from the registry.
 * Returns information about each registered processor including
 * supported MIME types, extensions, and priority.
 *
 * @returns Array of processor information objects
 *
 * @example
 * ```typescript
 * const supportedTypes = getSupportedFileTypes();
 *
 * for (const { name, mimeTypes, extensions, priority } of supportedTypes) {
 *   console.log(`${name} (priority: ${priority})`);
 *   console.log(`  MIME types: ${mimeTypes.join(", ")}`);
 *   console.log(`  Extensions: ${extensions.join(", ")}`);
 * }
 * ```
 */
export async function getSupportedFileTypes(): Promise<
  Array<{
    name: string;
    mimeTypes: string[];
    extensions: string[];
    priority: number;
  }>
> {
  const registry = await getProcessorRegistry();
  const processors = registry.listProcessors();

  return processors.map((p) => ({
    name: p.name,
    mimeTypes: p.processor.getConfig().supportedMimeTypes || [],
    extensions: p.processor.getConfig().supportedExtensions || [],
    priority: p.priority,
  }));
}

/**
 * Check if a file type is supported by any registered processor.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if a processor exists for this file type
 *
 * @example
 * ```typescript
 * // Check by MIME type and filename
 * if (isFileTypeSupported("application/pdf", "document.pdf")) {
 *   console.log("PDF files are supported");
 * }
 *
 * // Useful for validation before upload
 * function validateFile(file: File): boolean {
 *   return isFileTypeSupported(file.type, file.name);
 * }
 * ```
 */
export async function isFileTypeSupported(
  mimetype: string,
  filename: string,
): Promise<boolean> {
  const registry = await getProcessorRegistry();
  return registry.findProcessor(mimetype, filename) !== null;
}

/**
 * Get the processor that would handle a specific file.
 * Returns the full processor match including confidence score.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns Processor match or null if no processor found
 *
 * @example
 * ```typescript
 * const match = getProcessorForFile("image/jpeg", "photo.jpg");
 *
 * if (match) {
 *   console.log(`Would use ${match.name} processor`);
 *   console.log(`Priority: ${match.priority}`);
 *   console.log(`Confidence: ${match.confidence}%`);
 * } else {
 *   console.log("No processor available for this file type");
 * }
 * ```
 */
export async function getProcessorForFile(
  mimetype: string,
  filename: string,
): Promise<ProcessorMatch | null> {
  const registry = await getProcessorRegistry();
  return registry.findProcessor(mimetype, filename);
}
