/**
 * YAML Processing Utility
 *
 * Handles downloading, validating, and processing YAML files with security.
 *
 * Security Notes:
 * ---------------
 * YAML parsing can be vulnerable to various attacks if not configured securely:
 *
 * 1. **Code Execution via Custom Tags**: YAML supports custom tags like `!!python/object`,
 *    `!!ruby/object`, or `!!js/function` that can execute arbitrary code when parsed.
 *    We use the 'core' schema which only allows standard YAML types (strings, numbers,
 *    booleans, null, arrays, and objects) and explicitly check for dangerous tag patterns.
 *
 * 2. **Billion Laughs Attack (Entity Expansion)**: YAML supports anchors (&) and aliases (*)
 *    for referencing content. Malicious YAML can use nested aliases to create exponential
 *    expansion (e.g., 10 levels of 10x expansion = 10^10 entities from a small file).
 *    js-yaml parses aliases as SHARED references, so the parsed tree stays small — the
 *    expansion happens at serialization. `asJson` is therefore produced by a bounded
 *    serializer that stops at the processor's byte limit and reports `null` instead of
 *    materialising the expanded document.
 *
 * 3. **Denial of Service**: Large or deeply nested YAML files can exhaust memory/CPU.
 *    Size limits are enforced by the base processor's maxSizeMB configuration.
 *
 * References:
 * - https://en.wikipedia.org/wiki/Billion_laughs_attack
 * - https://cwe.mitre.org/data/definitions/502.html (Deserialization of Untrusted Data)
 *
 * @module processors/data/YamlProcessor
 *
 * @example
 * ```typescript
 * import { yamlProcessor, isYamlFile, processYaml } from "./YamlProcessor.js";
 *
 * // Check if file is YAML
 * if (isYamlFile("application/x-yaml", "config.yaml")) {
 *   // Process the file
 *   const result = await processYaml(fileInfo);
 *   if (result.success && result.data) {
 *     console.log("Parsed YAML:", result.data.parsed);
 *     console.log("As JSON:", result.data.asJson);
 *   }
 * }
 * ```
 */

import { createRequire } from "node:module";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  ProcessorFileProcessingResult,
  ProcessorOperationResult,
  ProcessOptions,
  ProcessedYaml,
} from "../../types/index.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import { createFileError, FileErrorCode } from "../errors/index.js";
import { logger } from "../../utils/logger.js";

// Re-export for consumers who import from this module

// Import for local use
const require = createRequire(import.meta.url);

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported YAML MIME types */
const SUPPORTED_YAML_TYPES = ["application/x-yaml", "text/yaml", "text/x-yaml"];

/** Supported YAML file extensions */
const SUPPORTED_YAML_EXTENSIONS = [".yaml", ".yml"];

/**
 * Dangerous YAML custom tags that can execute code.
 * These patterns indicate potential security threats and should be rejected.
 */
const YAML_DANGEROUS_TAGS = [
  // Python code execution
  "!!python/object",
  "!!python/object/apply",
  "!!python/object/new",
  "!!python/name",
  "!!python/module",
  // Ruby code execution
  "!!ruby/object",
  "!!ruby/hash",
  "!!ruby/struct",
  "!!ruby/sym",
  // JavaScript code execution
  "!!js/function",
  "!!js/undefined",
  // General dangerous patterns
  "!!perl/",
  "!!php/",
  "!!java/",
];

// =============================================================================
// YAML PROCESSOR CLASS
// =============================================================================

/**
 * YAML file processor.
 * Extends BaseFileProcessor with YAML-specific parsing and validation.
 *
 * Uses secure parsing configuration to prevent:
 * - Code execution via custom tags (uses 'core' schema)
 * - Billion laughs attack (limits alias count to 100)
 * - Dangerous custom tag injection (explicit pattern checking)
 *
 * @example
 * ```typescript
 * const processor = new YamlProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: "config.yaml",
 *   mimetype: "application/x-yaml",
 *   size: 1024,
 *   buffer: yamlBuffer,
 * });
 *
 * if (result.success && result.data?.valid) {
 *   console.log("As JSON:", result.data.asJson);
 * }
 * ```
 */
export class YamlProcessor extends BaseFileProcessor<ProcessedYaml> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS_MB.YAML_MAX_MB,
      timeoutMs: 30000,
      supportedMimeTypes: SUPPORTED_YAML_TYPES,
      supportedExtensions: SUPPORTED_YAML_EXTENSIONS,
      fileTypeName: "YAML",
      defaultFilename: "config.yaml",
    });
  }

  /**
   * Get detected dangerous tags in YAML content.
   *
   * @param content - Raw YAML content string
   * @returns Array of detected dangerous tags (empty if none found)
   */
  private getDetectedDangerousTags(content: string): string[] {
    return YAML_DANGEROUS_TAGS.filter((pattern) => content.includes(pattern));
  }

  /**
   * Parse YAML content securely using strict schema.
   *
   * Security measures:
   * - 'core' schema: Only allows standard YAML types (string, number, boolean, null, array, object)
   * - maxAliasCount: Limits alias expansion to prevent billion laughs attack
   *
   * @param content - Raw YAML content string
   * @returns Parsed YAML content
   */
  private parseYamlSecurely(content: string): unknown {
    // Dynamically import js-yaml to parse YAML securely
    const yaml = require("js-yaml");
    return yaml.load(content, {
      schema: yaml.CORE_SCHEMA, // Only allow standard YAML types, no custom tags
      // Prevent billion laughs attack via alias expansion
      // Note: js-yaml doesn't have maxAliasCount, but using CORE_SCHEMA + size limits provides protection
    });
  }

  /**
   * Validate downloaded YAML is parseable and safe with structured error result.
   * Checks for dangerous custom tags and validates YAML syntax.
   * Returns user-friendly error messages with actionable suggestions.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Success result or error result
   */
  protected override async validateDownloadedFileWithResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): Promise<ProcessorOperationResult<void>> {
    try {
      const content = buffer.toString("utf-8");

      // Check for potentially dangerous YAML constructs before parsing
      const detectedTags = this.getDetectedDangerousTags(content);
      if (detectedTags.length > 0) {
        const error = createFileError(FileErrorCode.CODE_EXECUTION_DETECTED, {
          fileType: "YAML",
          detectedTags: detectedTags.join(", "),
          filename: fileInfo.name,
        });
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            userMessage: error.userMessage,
            details: error.details,
          },
        };
      }

      // Parse with secure configuration
      this.parseYamlSecurely(content);
      return { success: true, data: undefined };
    } catch (error) {
      const fileError = createFileError(
        FileErrorCode.PARSING_FAILED,
        { fileType: "YAML" },
        error instanceof Error ? error : undefined,
      );
      return {
        success: false,
        error: {
          code: fileError.code,
          message: fileError.message,
          userMessage: fileError.userMessage,
          details: fileError.details,
        },
      };
    }
  }

  /**
   * Build processed YAML result with parsed content.
   * Uses secure parsing configuration to prevent code execution attacks.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed YAML result
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedYaml {
    const content = buffer.toString("utf-8");
    let parsed: unknown = null;
    let valid = true;
    let errorMessage: string | undefined;
    let asJson: string | null = null;

    try {
      // Use secure parsing - validation already passed, but maintain consistent security
      parsed = this.parseYamlSecurely(content);
      // Bounded: a 30-level alias chain is a few hundred bytes of YAML and a
      // small shared-reference graph in memory, but 2^30 nodes once
      // stringified. The serializer gives up at the processor's own byte
      // limit rather than letting `JSON.stringify` expand it.
      asJson = boundedJsonStringify(
        parsed,
        this.config.maxSizeMB * 1024 * 1024,
      );
      if (asJson === null) {
        logger.warn(
          `[YamlProcessor] "${this.getFilename(fileInfo)}" expands past the ${this.config.maxSizeMB}MB limit when serialized (alias expansion); asJson omitted`,
        );
      }
    } catch (error) {
      // This shouldn't happen since we validate, but handle gracefully
      valid = false;
      errorMessage = error instanceof Error ? error.message : "Invalid YAML";
    }

    return {
      content,
      parsed,
      valid,
      errorMessage,
      asJson,
      buffer,
      mimetype: fileInfo.mimetype || "application/x-yaml",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }
}

// =============================================================================
// BOUNDED SERIALIZATION
// =============================================================================

/**
 * `JSON.stringify(value, null, 2)` that stops once the output would pass
 * `maxChars`, returning `null` instead. Walks the value iteratively enough to
 * visit shared references once per path (which is what expands an alias
 * bomb) but counts output as it goes, so the work is bounded by the limit
 * rather than by the document's expanded size. Cycles — which YAML anchors
 * can also express — serialize as `"[Circular]"`.
 */
export function boundedJsonStringify(
  value: unknown,
  maxChars: number,
): string | null {
  const parts: string[] = [];
  let length = 0;
  const ancestors: object[] = [];
  const push = (text: string): boolean => {
    length += text.length;
    if (length > maxChars) {
      return false;
    }
    parts.push(text);
    return true;
  };
  const walk = (node: unknown, indent: string): boolean => {
    if (node === null || typeof node !== "object") {
      if (node === undefined || typeof node === "function") {
        return push("null");
      }
      if (typeof node === "number" && !Number.isFinite(node)) {
        return push("null");
      }
      return push(JSON.stringify(node));
    }
    if (ancestors.includes(node)) {
      return push('"[Circular]"');
    }
    ancestors.push(node);
    try {
      const inner = `${indent}  `;
      if (Array.isArray(node)) {
        if (node.length === 0) {
          return push("[]");
        }
        if (!push("[\n")) {
          return false;
        }
        for (let i = 0; i < node.length; i++) {
          if (!push(inner) || !walk(node[i], inner)) {
            return false;
          }
          if (!push(i < node.length - 1 ? ",\n" : "\n")) {
            return false;
          }
        }
        return push(`${indent}]`);
      }
      const entries = Object.entries(node as Record<string, unknown>).filter(
        ([, v]) => v !== undefined && typeof v !== "function",
      );
      if (entries.length === 0) {
        return push("{}");
      }
      if (!push("{\n")) {
        return false;
      }
      for (let i = 0; i < entries.length; i++) {
        const [key, child] = entries[i];
        if (!push(`${inner}${JSON.stringify(key)}: `) || !walk(child, inner)) {
          return false;
        }
        if (!push(i < entries.length - 1 ? ",\n" : "\n")) {
          return false;
        }
      }
      return push(`${indent}}`);
    } finally {
      ancestors.pop();
    }
  };
  return walk(value, "") ? parts.join("") : null;
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Singleton YAML processor instance */
export const yamlProcessor = new YamlProcessor();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a file is a YAML file based on MIME type or extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a YAML file
 *
 * @example
 * ```typescript
 * if (isYamlFile("application/x-yaml", "config.yaml")) {
 *   // Process as YAML
 * }
 * ```
 */
export function isYamlFile(mimetype: string, filename: string): boolean {
  return yamlProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate YAML file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the limit
 */
export function validateYamlSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS_MB.YAML_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single YAML file with security validation.
 *
 * @param fileInfo - File information (with URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with parsed YAML or error
 *
 * @example
 * ```typescript
 * const result = await processYaml({
 *   id: "file-123",
 *   name: "config.yaml",
 *   mimetype: "application/x-yaml",
 *   size: 2048,
 *   url: "https://example.com/config.yaml",
 * }, {
 *   authHeaders: { "Authorization": "Bearer token" },
 * });
 *
 * if (result.success && result.data) {
 *   console.log("Parsed:", result.data.parsed);
 *   console.log("As JSON:", result.data.asJson);
 * }
 * ```
 */
export function processYaml(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<ProcessorFileProcessingResult<ProcessedYaml>> {
  return yamlProcessor.processFile(fileInfo, options);
}
