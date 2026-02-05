/**
 * Base File Processor Infrastructure
 *
 * Provides the foundation for building file processors in NeuroLink.
 * This module contains:
 * - Abstract base class for file processors (BaseFileProcessor)
 * - ALL type definitions for file processing operations
 * - Constants for defaults and priorities
 *
 * @module processors/base
 */

// =============================================================================
// BASE PROCESSOR CLASS
// =============================================================================

export {
  BaseFileProcessor,
  getDefaultImageMaxSizeMB,
  getDefaultImageTimeout,
  getDefaultTextMaxSizeMB,
  getDefaultTextTimeout,
} from "./BaseFileProcessor.js";

// =============================================================================
// TYPE DEFINITIONS (single source of truth)
// =============================================================================

export type {
  BatchProcessingSummary,
  // Error-related types (re-exported from errors module)
  ErrorMessageTemplate,
  ExcelWorksheet,
  FailedFileInfo,
  FileErrorCode,
  // Core types
  FileInfo,
  // Error types
  FileProcessingError,
  FileProcessingResult,
  FileProcessorConfig,
  FileWarning,
  // Utility types
  JsonTypeGuard,
  // Result types
  OperationResult,
  ProcessedConfig,
  ProcessedExcel,
  ProcessedFileBase,
  // Batch processing types
  ProcessedFileInfo,
  ProcessedHtml,
  ProcessedJson,
  ProcessedMarkdown,
  ProcessedOpenDocument,
  ProcessedRtf,
  ProcessedSourceCode,
  // Specific processed file types
  ProcessedSvg,
  ProcessedText,
  ProcessedWord,
  ProcessedXml,
  ProcessedYaml,
  ProcessOptions,
  ProcessorInfo,
  // Registry types (defined here to avoid circular deps)
  ProcessorMatch,
  ProcessorPriorityKey,
  ProcessorPriorityValue,
  RegistryOptions,
  RegistryProcessResult,
  // Processing options
  RetryConfig,
  SkippedFileInfo,
  UnsupportedFileError,
} from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  DEFAULT_IMAGE_MAX_SIZE_MB,
  DEFAULT_IMAGE_TIMEOUT_MS,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TEXT_MAX_SIZE_MB,
  DEFAULT_TEXT_TIMEOUT_MS,
  PROCESSOR_PRIORITIES,
} from "./types.js";
