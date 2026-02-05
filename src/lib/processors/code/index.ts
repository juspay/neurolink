/**
 * Code Processors Module
 *
 * Provides file processors for source code files across 50+ programming languages.
 * Uses extension-based detection as primary method for reliable identification.
 *
 * @module processors/code
 *
 * @example
 * ```typescript
 * import {
 *   // Processor class and singleton
 *   SourceCodeProcessor,
 *   sourceCodeProcessor,
 *
 *   // Helper functions
 *   isSourceCodeFile,
 *   processSourceCode,
 *   validateSourceCodeSize,
 *   detectLanguage,
 *
 *   // Types
 *   type ProcessedSourceCode,
 * } from "./code/index.js";
 *
 * // Check if a file is source code
 * if (isSourceCodeFile("text/plain", "main.py")) {
 *   const result = await processSourceCode({
 *     id: "file-123",
 *     name: "main.py",
 *     mimetype: "text/plain",
 *     size: 1024,
 *     buffer: codeBuffer,
 *   });
 *
 *   if (result.success) {
 *     console.log(`Language: ${result.data.language}`); // "Python"
 *     console.log(`Lines: ${result.data.lineCount}`);
 *   }
 * }
 * ```
 */

// =============================================================================
// SOURCE CODE PROCESSOR
// =============================================================================

export {
  // Helper functions
  detectLanguage,
  isSourceCodeFile,
  // Types
  type ProcessedSourceCode,
  processSourceCode,
  // Processor class and singleton
  SourceCodeProcessor,
  sourceCodeProcessor,
  validateSourceCodeSize,
} from "./SourceCodeProcessor.js";

// =============================================================================
// CONFIG PROCESSOR
// =============================================================================

export {
  // Processor class
  ConfigProcessor,
  // Singleton instance
  configProcessor,
  // Helper functions
  isConfigFile,
  // Types
  type ProcessedConfig,
  processConfig,
} from "./ConfigProcessor.js";
