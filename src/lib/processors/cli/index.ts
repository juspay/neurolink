/**
 * CLI Helpers for File Processors
 *
 * Utilities for CLI integration of the file processor system.
 * Provides file loading, processing, and output formatting for CLI commands.
 *
 * @module processors/cli
 *
 * @example
 * ```typescript
 * import {
 *   loadFileFromPath,
 *   processFileFromPath,
 *   listSupportedFileTypes,
 *   getCliUsage,
 *   type CliFileProcessingOptions,
 * } from "./processors/cli/index.js";
 *
 * // Process a file with verbose output
 * const result = await processFileFromPath("./document.pdf", {
 *   verbose: true,
 *   outputFormat: "json",
 * });
 *
 * if (result.success) {
 *   console.log(`Processed with: ${result.processorUsed}`);
 *   console.log(result.output);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 *
 * // List all supported file types
 * console.log(listSupportedFileTypes());
 * ```
 */

// =============================================================================
// MAIN EXPORTS
// =============================================================================

export {
  detectMimeType,
  // Utility functions
  fileExists,
  // CLI help
  getCliUsage,
  getFileExtension,
  // File type listing
  getSupportedFileTypes,
  listSupportedFileTypes,
  // File loading
  loadFileFromPath,
  // File processing
  processFileFromPath,
} from "./fileProcessorCli.js";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  CliFileProcessingOptions,
  CliProcessingResult,
  SupportedFileTypeInfo,
} from "./fileProcessorCli.js";
