/**
 * Processor Registry Type Definitions
 *
 * Contains only types unique to the registry module.
 * All shared types (ProcessorMatch, RegistryOptions, etc.) are defined
 * in the single source of truth: processors/base/types.ts
 *
 * @module processors/registry/types
 */

import type { BaseFileProcessor } from "../base/index.js";
import type { ProcessedFileBase } from "../base/types.js";

// =============================================================================
// PROCESSOR REGISTRATION (unique to registry)
// =============================================================================

/**
 * Registration entry for a file processor.
 * Contains all information needed to register and use a processor.
 *
 * @typeParam T - The type of processed result, must extend ProcessedFileBase
 *
 * @example
 * ```typescript
 * const pdfRegistration: ProcessorRegistration<ProcessedPDF> = {
 *   name: "pdf",
 *   priority: PROCESSOR_PRIORITIES.PDF,
 *   processor: new PDFProcessor(),
 *   isSupported: (mimetype, filename) =>
 *     mimetype === "application/pdf" || filename.endsWith(".pdf"),
 *   description: "Processes PDF documents",
 *   aliases: ["document", "acrobat"],
 * };
 * ```
 */
export type ProcessorRegistration<
  T extends ProcessedFileBase = ProcessedFileBase,
> = {
  /** Unique name for the processor */
  name: string;

  /**
   * Priority level for this processor.
   * Lower number = higher priority = processed first.
   * Use PROCESSOR_PRIORITIES constants for standard values.
   */
  priority: number;

  /** The processor instance that handles file processing */
  processor: BaseFileProcessor<T>;

  /**
   * Function to determine if this processor can handle a given file.
   * @param mimetype - MIME type of the file
   * @param filename - Filename (for extension-based detection)
   * @returns true if this processor can handle the file
   */
  isSupported: (mimetype: string, filename: string) => boolean;

  /** Human-readable description of what this processor does */
  description?: string;

  /** Alternative names that can be used to look up this processor */
  aliases?: string[];
};
