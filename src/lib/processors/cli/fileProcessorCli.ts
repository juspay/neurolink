/**
 * CLI Helpers for File Processors
 *
 * Provides utilities for CLI integration of the file processor system.
 * These helpers can be used by CLI commands to process files.
 *
 * @module processors/cli/fileProcessorCli
 *
 * @example
 * ```typescript
 * import {
 *   loadFileFromPath,
 *   processFileFromPath,
 *   listSupportedFileTypes,
 *   getCliUsage,
 * } from "./processors/cli/index.js";
 *
 * // Process a file from the CLI
 * const result = await processFileFromPath("./document.docx", {
 *   verbose: true,
 *   outputFormat: "json",
 * });
 *
 * if (result.success) {
 *   console.log(result.output);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";

import { logger } from "../../utils/logger.js";
import type { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type { FileInfo, ProcessedFileBase } from "../base/types.js";
import { getMimeTypeForExtension } from "../config/index.js";
import { getProcessorRegistry } from "../registry/index.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for CLI file processing
 */
export type CliFileProcessingOptions = {
  /** Verbose output - shows processing details */
  verbose?: boolean;
  /** Processor to use (bypasses auto-detection) */
  processor?: string;
  /** Output format: json, text, or raw */
  outputFormat?: "json" | "text" | "raw";
};

/**
 * Result of CLI file processing
 */
export type CliProcessingResult = {
  /** Whether processing succeeded */
  success: boolean;
  /** Name of the processor that was used */
  processorUsed: string | null;
  /** Formatted output string */
  output: string;
  /** Error message if processing failed */
  error?: string;
};

/**
 * Information about a supported file type
 */
export type SupportedFileTypeInfo = {
  /** Processor name */
  name: string;
  /** Priority (lower = processed first) */
  priority: number;
  /** Supported file extensions */
  extensions: string[];
  /** Supported MIME types */
  mimeTypes: string[];
  /** Optional description */
  description?: string;
};

// =============================================================================
// MIME TYPE MAPPING
// =============================================================================

// Extension-to-MIME mapping is imported from the centralized config
// (../config/mimeTypes.ts) via EXTENSION_MIME_MAP and getMimeTypeForExtension.
// This avoids duplicating the ~90-entry mapping that was previously inline here.
// See EXTENSION_MIME_MAP for the single source of truth.

// =============================================================================
// FILE LOADING
// =============================================================================

/**
 * Load a file from the filesystem and create a FileInfo object.
 *
 * @param filePath - Path to the file (relative or absolute)
 * @returns FileInfo object ready for processing
 * @throws Error if file doesn't exist or is not a file
 *
 * @example
 * ```typescript
 * const fileInfo = await loadFileFromPath("./document.pdf");
 * console.log(`Loaded: ${fileInfo.name} (${fileInfo.size} bytes)`);
 * ```
 */
export async function loadFileFromPath(filePath: string): Promise<FileInfo> {
  const absolutePath = path.resolve(filePath);

  let stats: fs.Stats;
  try {
    stats = await fsPromises.stat(absolutePath);
  } catch {
    throw new Error(`File not found: ${absolutePath}`);
  }
  if (!stats.isFile()) {
    throw new Error(`Not a file: ${absolutePath}`);
  }

  const buffer = await fsPromises.readFile(absolutePath);
  const filename = path.basename(absolutePath);
  const ext = path.extname(filename).toLowerCase();

  // Determine MIME type from extension
  const mimeType = getMimeTypeForExtension(ext);

  return {
    id: absolutePath,
    name: filename,
    mimetype: mimeType,
    size: stats.size,
    buffer,
  };
}

// =============================================================================
// FILE PROCESSING
// =============================================================================

/**
 * Process a file from a path using the CLI.
 *
 * @param filePath - Path to the file to process
 * @param options - Processing options (verbose, processor, outputFormat)
 * @returns Processing result with success status, output, and error info
 *
 * @example
 * ```typescript
 * const result = await processFileFromPath("./data.xlsx", {
 *   verbose: true,
 *   outputFormat: "json",
 * });
 *
 * if (result.success) {
 *   console.log(result.output);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 */
export async function processFileFromPath(
  filePath: string,
  options?: CliFileProcessingOptions,
): Promise<CliProcessingResult> {
  try {
    const fileInfo = await loadFileFromPath(filePath);

    if (options?.verbose) {
      logger.info(`Processing: ${fileInfo.name}`);
      logger.info(`  Size: ${fileInfo.size} bytes`);
      logger.info(`  MIME: ${fileInfo.mimetype}`);
    }

    const registry = await getProcessorRegistry();

    // If a specific processor is requested, use it directly
    if (options?.processor) {
      const processorReg = registry.getProcessor(options.processor);
      if (!processorReg) {
        return {
          success: false,
          processorUsed: null,
          output: "",
          error: `Processor not found: ${options.processor}. Use 'list-file-types' to see available processors.`,
        };
      }

      const result = await processorReg.processor.processFile(fileInfo);

      if (options?.verbose) {
        logger.info(`  Processor: ${options.processor}`);
      }

      if (!result.success || !result.data) {
        return {
          success: false,
          processorUsed: options.processor,
          output: "",
          error: result.error?.message || "Processing failed",
        };
      }

      const output = formatOutput(result.data, options?.outputFormat || "text");
      return {
        success: true,
        processorUsed: options.processor,
        output,
      };
    }

    // Auto-detect processor
    const match = registry.findProcessor(fileInfo.mimetype, fileInfo.name);

    if (!match) {
      return {
        success: false,
        processorUsed: null,
        output: "",
        error: `No processor found for file type: ${fileInfo.mimetype} (${fileInfo.name})`,
      };
    }

    if (options?.verbose) {
      logger.info(`  Processor: ${match.name}`);
      logger.info(`  Confidence: ${match.confidence}%`);
    }

    const processor = match.processor as BaseFileProcessor<ProcessedFileBase>;
    const result = await processor.processFile(fileInfo);

    if (!result.success || !result.data) {
      return {
        success: false,
        processorUsed: match.name,
        output: "",
        error: result.error?.message || "Processing failed",
      };
    }

    // Format output based on options
    const output = formatOutput(result.data, options?.outputFormat || "text");

    return {
      success: true,
      processorUsed: match.name,
      output,
    };
  } catch (error) {
    return {
      success: false,
      processorUsed: null,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

/**
 * Format processed file output for display.
 *
 * @param data - Processed file data
 * @param format - Output format (json, text, or raw)
 * @returns Formatted output string
 */
function formatOutput(
  data: ProcessedFileBase,
  format: "json" | "text" | "raw",
): string {
  if (format === "json") {
    // Create a serializable version (summarize buffer)
    const serializable = {
      ...data,
      buffer: `<Buffer ${data.buffer.length} bytes>`,
    };
    return JSON.stringify(serializable, null, 2);
  }

  if (format === "raw") {
    return data.buffer.toString("utf-8");
  }

  // Text format - extract text content if available
  const dataRecord = data as unknown as Record<string, unknown>;
  const textFields = ["textContent", "content", "text", "parsedContent"];
  for (const field of textFields) {
    const value = dataRecord[field];
    if (typeof value === "string") {
      return value;
    }
  }

  // Check for structured data that should be stringified
  const structuredFields = ["parsedData", "data", "rows", "sheets"];
  for (const field of structuredFields) {
    const value = dataRecord[field];
    if (value !== undefined && value !== null) {
      return JSON.stringify(value, null, 2);
    }
  }

  // Fallback to JSON representation
  const serializable = {
    ...data,
    buffer: `<Buffer ${data.buffer.length} bytes>`,
  };
  return JSON.stringify(serializable, null, 2);
}

// =============================================================================
// FILE TYPE LISTING
// =============================================================================

/**
 * Get information about all supported file types.
 *
 * @returns Array of supported file type information
 *
 * @example
 * ```typescript
 * const types = getSupportedFileTypes();
 * for (const type of types) {
 *   console.log(`${type.name}: ${type.extensions.join(", ")}`);
 * }
 * ```
 */
export async function getSupportedFileTypes(): Promise<
  SupportedFileTypeInfo[]
> {
  const registry = await getProcessorRegistry();
  const processors = registry.listProcessors();

  return processors.map((proc) => {
    // Extract config from processor via public getConfig() method
    const config = proc.processor.getConfig();

    return {
      name: proc.name,
      priority: proc.priority,
      extensions: config.supportedExtensions,
      mimeTypes: config.supportedMimeTypes,
      description: proc.description,
    };
  });
}

/**
 * List all supported file types formatted for CLI display.
 *
 * @returns Formatted string listing all supported file types
 *
 * @example
 * ```typescript
 * console.log(listSupportedFileTypes());
 * ```
 */
export async function listSupportedFileTypes(): Promise<string> {
  const types = await getSupportedFileTypes();

  if (types.length === 0) {
    return "No processors registered. Initialize the processor registry first.";
  }

  let output = "Supported file types:\n\n";

  // Sort by priority (lower = higher priority)
  const sortedTypes = [...types].sort((a, b) => a.priority - b.priority);

  for (const type of sortedTypes) {
    output += `  ${type.name} (priority: ${type.priority})\n`;

    if (type.description) {
      output += `    ${type.description}\n`;
    }

    if (type.extensions.length > 0) {
      output += `    Extensions: ${type.extensions.join(", ")}\n`;
    }

    if (type.mimeTypes.length > 0) {
      // Show first 3 MIME types to avoid overwhelming output
      const displayMimes = type.mimeTypes.slice(0, 3);
      const suffix =
        type.mimeTypes.length > 3
          ? ` (+${type.mimeTypes.length - 3} more)`
          : "";
      output += `    MIME types: ${displayMimes.join(", ")}${suffix}\n`;
    }

    output += "\n";
  }

  return output;
}

// =============================================================================
// CLI USAGE HELP
// =============================================================================

/**
 * Get CLI usage information for file processing commands.
 *
 * @returns Usage help string
 *
 * @example
 * ```typescript
 * console.log(getCliUsage());
 * ```
 */
export function getCliUsage(): string {
  return `
File Processor CLI Usage:

  Process a file:
    neurolink process-file <path> [options]
    
  Options:
    --processor <name>   Use specific processor (e.g., excel, word, json)
    --format <type>      Output format: json, text, or raw
    --verbose            Show processing details
    
  List supported types:
    neurolink list-file-types
    
  Examples:
    neurolink process-file document.docx
    neurolink process-file data.xlsx --format json
    neurolink process-file config.yaml --processor yaml
    neurolink process-file report.pdf --verbose
    neurolink process-file data.csv --format raw
    
  Output Formats:
    text  - Extract text content (default)
    json  - Full structured output as JSON
    raw   - Raw file content as UTF-8 string

  Notes:
    - Processor is auto-detected based on file extension and MIME type
    - Use --processor to override auto-detection
    - Use --verbose to see which processor was selected
`;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a file exists and is readable.
 *
 * @param filePath - Path to check
 * @returns true if file exists and is readable
 */
export function fileExists(filePath: string): boolean {
  try {
    const absolutePath = path.resolve(filePath);
    fs.accessSync(absolutePath, fs.constants.R_OK);
    return fs.statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Get file extension from a path.
 *
 * @param filePath - File path
 * @returns Lowercase extension with leading dot, or empty string
 */
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.toLowerCase();
}

/**
 * Detect MIME type for a file path.
 *
 * @param filePath - File path
 * @returns Detected MIME type
 */
export function detectMimeType(filePath: string): string {
  const ext = getFileExtension(filePath);
  return getMimeTypeForExtension(ext);
}
