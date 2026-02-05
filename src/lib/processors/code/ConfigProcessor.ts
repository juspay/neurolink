/**
 * Config File Processor
 *
 * Processes configuration files (.env, .ini, .toml, .cfg, .conf, .properties).
 * Automatically detects format based on extension and redacts sensitive values
 * for security.
 *
 * Key features:
 * - Format detection (env, ini, toml, properties)
 * - Automatic secret redaction (passwords, tokens, API keys)
 * - Key-value extraction for structured access
 * - Security-first approach to config file handling
 *
 * Priority: 130 (lower priority - text-based config files)
 *
 * @module processors/code/ConfigProcessor
 *
 * @example
 * ```typescript
 * import { configProcessor, processConfig, isConfigFile } from "./code/index.js";
 *
 * // Check if a file is a config file
 * if (isConfigFile("text/plain", ".env")) {
 *   const result = await processConfig({
 *     id: "file-123",
 *     name: ".env",
 *     mimetype: "text/plain",
 *     size: 512,
 *     buffer: envBuffer,
 *   });
 *
 *   if (result.success) {
 *     console.log(`Format: ${result.data.format}`);
 *     console.log(`Redacted keys: ${result.data.redactedKeys.join(", ")}`);
 *   }
 * }
 * ```
 */

import { basename as pathBasename } from "node:path";
import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS } from "../config/index.js";

// =============================================================================
// TYPES
// =============================================================================

export type { ProcessedConfig } from "../base/types.js";

// Re-import for local use within this file
import type { ProcessedConfig } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Regex patterns for identifying keys that likely contain secrets.
 * These keys will have their values redacted in the output.
 */
const SECRET_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private/i,
  /access[_-]?token/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /cookie/i,
  /encryption/i,
  /salt/i,
  /hash/i,
  /cert/i,
  /certificate/i,
  /pem/i,
  /rsa/i,
  /ssh/i,
  /aws[_-]?secret/i,
  /azure[_-]?key/i,
  /gcp[_-]?key/i,
];

/**
 * Supported MIME types for configuration files
 */
const SUPPORTED_CONFIG_MIME_TYPES = [
  "text/plain",
  "application/x-env",
  "text/x-ini",
  "application/toml",
];

/**
 * Supported file extensions for configuration files
 */
const SUPPORTED_CONFIG_EXTENSIONS = [
  ".env",
  ".ini",
  ".toml",
  ".cfg",
  ".conf",
  ".properties",
];

/**
 * Default timeout for config file processing (30 seconds)
 */
const CONFIG_TIMEOUT_MS = 30000;

// =============================================================================
// CONFIG PROCESSOR CLASS
// =============================================================================

/**
 * Config Processor - handles configuration files with security redaction.
 *
 * Automatically detects the format based on file extension and extracts
 * key-value pairs while redacting sensitive values for security.
 *
 * Priority: 130 (processed after binary/document formats)
 *
 * @example
 * ```typescript
 * const processor = new ConfigProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: ".env",
 *   mimetype: "text/plain",
 *   size: 512,
 *   buffer: envBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(`Detected format: ${result.data.format}`);
 *   console.log(`Redacted ${result.data.redactedKeys.length} sensitive keys`);
 * }
 * ```
 */
export class ConfigProcessor extends BaseFileProcessor<ProcessedConfig> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.TEXT_MAX_MB,
      timeoutMs: CONFIG_TIMEOUT_MS,
      supportedMimeTypes: SUPPORTED_CONFIG_MIME_TYPES,
      supportedExtensions: SUPPORTED_CONFIG_EXTENSIONS,
      fileTypeName: "Config",
      defaultFilename: "config.env",
    });
  }

  /**
   * Override to check for exact filename matches like ".env" files.
   *
   * @param mimetype - MIME type of the file
   * @param filename - Filename for detection
   * @returns true if the file is a supported config file
   */
  public override isFileSupported(mimetype: string, filename: string): boolean {
    if (!filename) {
      return false;
    }

    // Check for exact filename matches (e.g., ".env", ".env.local")
    const basename = pathBasename(filename);

    // Special handling for dotenv files
    if (basename.startsWith(".env")) {
      return true;
    }

    // Check by extension
    const ext = this.getExtension(filename);
    if (ext && SUPPORTED_CONFIG_EXTENSIONS.includes(ext.toLowerCase())) {
      return true;
    }

    // Fall back to MIME type check
    return super.isFileSupported(mimetype, filename);
  }

  /**
   * Build the processed config result.
   * Detects format, extracts key-values, and redacts sensitive content.
   *
   * @param buffer - Raw file content
   * @param fileInfo - Original file information
   * @returns Processed config with redacted content and key-value pairs
   */
  protected buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedConfig {
    const content = buffer.toString("utf-8");
    const ext = this.getExtension(fileInfo.name || "");

    const format = this.detectFormat(ext, content);
    const { keyValues, redactedKeys } = this.parseAndRedact(content, format);

    return {
      content: this.redactContent(content, redactedKeys),
      format,
      keyValues,
      redactedKeys,
      buffer,
      mimetype: fileInfo.mimetype || "text/plain",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  /**
   * Detect the configuration format based on extension and content.
   *
   * @param ext - File extension (with leading dot)
   * @param content - File content for format heuristics
   * @returns Detected format
   */
  private detectFormat(
    ext: string | null,
    content: string,
  ): ProcessedConfig["format"] {
    // First check extension
    if (ext) {
      const lowerExt = ext.toLowerCase();
      if (lowerExt === ".env") {
        return "env";
      }
      if (lowerExt === ".ini" || lowerExt === ".cfg" || lowerExt === ".conf") {
        return "ini";
      }
      if (lowerExt === ".toml") {
        return "toml";
      }
      if (lowerExt === ".properties") {
        return "properties";
      }
    }

    // Try content-based heuristics
    const lines = content
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"));

    // Check for TOML markers
    if (
      content.includes("[") &&
      content.includes("]") &&
      lines.some((l) => l.includes("="))
    ) {
      // Could be INI or TOML - check for TOML-specific syntax
      if (
        content.includes("[[") ||
        content.includes('"""') ||
        content.includes("'''")
      ) {
        return "toml";
      }
      return "ini";
    }

    // Check for properties-style (key: value or key = value with Java conventions)
    if (lines.some((l) => l.includes(":") && !l.includes("="))) {
      return "properties";
    }

    // Default to env format for simple KEY=VALUE files
    if (lines.some((l) => /^[A-Z_][A-Z0-9_]*=/i.test(l.trim()))) {
      return "env";
    }

    return "unknown";
  }

  /**
   * Parse configuration content and redact sensitive values.
   *
   * @param content - Raw configuration content
   * @param format - Detected format
   * @returns Key-value pairs and list of redacted keys
   */
  private parseAndRedact(
    content: string,
    format: ProcessedConfig["format"],
  ): { keyValues: Record<string, string>; redactedKeys: string[] } {
    const keyValues: Record<string, string> = {};
    const redactedKeys: string[] = [];

    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (
        !trimmedLine ||
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith(";")
      ) {
        continue;
      }

      // Skip section headers (INI/TOML style)
      if (trimmedLine.startsWith("[")) {
        continue;
      }

      // Try to extract key-value pair
      let key = "";
      let value = "";

      // Handle different formats
      if (
        format === "properties" &&
        trimmedLine.includes(":") &&
        !trimmedLine.includes("=")
      ) {
        // Properties format: key: value or key : value
        const colonIndex = trimmedLine.indexOf(":");
        key = trimmedLine.substring(0, colonIndex).trim();
        value = trimmedLine.substring(colonIndex + 1).trim();
      } else if (trimmedLine.includes("=")) {
        // Standard KEY=VALUE format
        const equalIndex = trimmedLine.indexOf("=");
        key = trimmedLine.substring(0, equalIndex).trim();
        value = trimmedLine.substring(equalIndex + 1).trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
      }

      if (key) {
        // Check if this key should be redacted
        if (this.isSensitiveKey(key)) {
          keyValues[key] = "[REDACTED]";
          redactedKeys.push(key);
        } else {
          keyValues[key] = value;
        }
      }
    }

    return { keyValues, redactedKeys };
  }

  /**
   * Check if a key likely contains sensitive data.
   *
   * @param key - Key name to check
   * @returns true if the key matches a sensitive pattern
   */
  private isSensitiveKey(key: string): boolean {
    return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
  }

  /**
   * Redact sensitive values in the original content.
   *
   * @param content - Original configuration content
   * @param redactedKeys - Keys to redact
   * @returns Content with redacted values
   */
  private redactContent(content: string, redactedKeys: string[]): string {
    let result = content;

    for (const key of redactedKeys) {
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Match key=value or key: value patterns
      const patterns = [
        // KEY=value (with optional quotes)
        new RegExp(`(${escapedKey}\\s*=\\s*)(["']?)[^"'\\n]*(["']?)`, "gm"),
        // KEY: value (properties style)
        new RegExp(`(${escapedKey}\\s*:\\s*)(.*)$`, "gm"),
      ];

      for (const regex of patterns) {
        result = result.replace(regex, "$1[REDACTED]");
      }
    }

    return result;
  }

  /**
   * Extract file extension from filename.
   *
   * @param filename - Filename to extract extension from
   * @returns Extension with leading dot or null
   */
  private getExtension(filename: string): string | null {
    // Handle .env files specially
    if (filename.startsWith(".env")) {
      return ".env";
    }

    const match = filename.toLowerCase().match(/\.[^.]+$/);
    return match ? match[0] : null;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton instance of the ConfigProcessor.
 * Use this for all configuration file processing to share configuration.
 */
export const configProcessor = new ConfigProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a configuration file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename for detection
 * @returns true if the file is a supported config file
 *
 * @example
 * ```typescript
 * if (isConfigFile("text/plain", ".env")) {
 *   console.log("This is a config file");
 * }
 * ```
 */
export function isConfigFile(mimetype: string, filename: string): boolean {
  return configProcessor.isFileSupported(mimetype, filename);
}

/**
 * Process a configuration file.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options
 * @returns Processing result with success flag and either data or error
 *
 * @example
 * ```typescript
 * const result = await processConfig({
 *   id: "file-123",
 *   name: ".env.production",
 *   mimetype: "text/plain",
 *   size: 1024,
 *   buffer: configBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(`Format: ${result.data.format}`);
 *   console.log(`Keys: ${Object.keys(result.data.keyValues).length}`);
 *   console.log(`Redacted: ${result.data.redactedKeys.join(", ")}`);
 * }
 * ```
 */
export async function processConfig(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedConfig>> {
  return configProcessor.processFile(fileInfo, options);
}
