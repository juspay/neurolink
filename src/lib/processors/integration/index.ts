/**
 * File Processor Integration Module
 *
 * Provides integration between the ProcessorRegistry and message building.
 * Exports utilities for processing files through registered processors
 * with automatic type detection and batch processing support.
 *
 * @module processors/integration
 *
 * @example
 * ```typescript
 * import {
 *   // Single file processing
 *   processFileWithRegistry,
 *
 *   // Batch processing
 *   processBatchWithRegistry,
 *
 *   // Discovery utilities
 *   getSupportedFileTypes,
 *   isFileTypeSupported,
 *   getProcessorForFile,
 *
 *   // Types
 *   type FileProcessingOptions,
 *   type BatchFileProcessingResult,
 * } from "./integration/index.js";
 *
 * // Process a single file with auto-detection
 * const { processorName, result } = await processFileWithRegistry(fileInfo);
 *
 * // Process multiple files
 * const batchResult = await processBatchWithRegistry(files, { maxFiles: 50 });
 *
 * // Check supported types
 * const supported = getSupportedFileTypes();
 * const isSupported = isFileTypeSupported("application/pdf", "doc.pdf");
 * const match = getProcessorForFile("image/jpeg", "photo.jpg");
 * ```
 */

// =============================================================================
// FUNCTION EXPORTS
// =============================================================================

export {
  getProcessorForFile,
  getSupportedFileTypes,
  isFileTypeSupported,
  processBatchWithRegistry,
  processFileWithRegistry,
} from "./FileProcessorIntegration.js";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  BatchFileProcessingResult,
  FileProcessingOptions,
} from "./FileProcessorIntegration.js";
