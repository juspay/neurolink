/**
 * Data Processors Module
 *
 * Provides processors for structured data formats (JSON, YAML, XML).
 * All processors include security validation and provide parsed content
 * for easy integration with AI models.
 *
 * @module processors/data
 *
 * @example
 * ```typescript
 * import {
 *   // JSON processing
 *   jsonProcessor,
 *   isJsonFile,
 *   processJson,
 *   type ProcessedJson,
 *
 *   // YAML processing (with security)
 *   yamlProcessor,
 *   isYamlFile,
 *   processYaml,
 *   type ProcessedYaml,
 *
 *   // XML processing (with XXE protection)
 *   xmlProcessor,
 *   isXmlFile,
 *   processXml,
 *   type ProcessedXml,
 * } from "./data/index.js";
 *
 * // Auto-detect and process
 * async function processDataFile(fileInfo: FileInfo) {
 *   if (isJsonFile(fileInfo.mimetype, fileInfo.name)) {
 *     return processJson(fileInfo);
 *   }
 *   if (isYamlFile(fileInfo.mimetype, fileInfo.name)) {
 *     return processYaml(fileInfo);
 *   }
 *   if (isXmlFile(fileInfo.mimetype, fileInfo.name)) {
 *     return processXml(fileInfo);
 *   }
 *   throw new Error("Unsupported data format");
 * }
 * ```
 */

// =============================================================================
// JSON PROCESSOR
// =============================================================================

export {
  // Utility functions
  isJsonFile,
  // Class
  JsonProcessor,
  // Singleton
  jsonProcessor,
  // Type
  type ProcessedJson,
  processJson,
  validateJsonSize,
} from "./JsonProcessor.js";

// =============================================================================
// YAML PROCESSOR
// =============================================================================

export {
  // Utility functions
  isYamlFile,
  // Type
  type ProcessedYaml,
  processYaml,
  validateYamlSize,
  // Class
  YamlProcessor,
  // Singleton
  yamlProcessor,
} from "./YamlProcessor.js";

// =============================================================================
// XML PROCESSOR
// =============================================================================

export {
  // Utility functions
  isXmlFile,
  // Type
  type ProcessedXml,
  processXml,
  validateXmlSize,
  // Class
  XmlProcessor,
  // Singleton
  xmlProcessor,
} from "./XmlProcessor.js";
