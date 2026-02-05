/**
 * XML Processing Utility
 *
 * Handles downloading, validating, and processing XML files with security.
 *
 * Security Notes:
 * ---------------
 * XML parsing can be vulnerable to XML External Entity (XXE) attacks:
 *
 * 1. **XXE Attacks**: DOCTYPE and ENTITY declarations can be exploited to:
 *    - Read local files on the server
 *    - Perform Server-Side Request Forgery (SSRF)
 *    - Cause Denial of Service via entity expansion
 *
 * 2. **Mitigation**: We reject XML files containing DOCTYPE or ENTITY declarations
 *    and disable entity processing in the parser.
 *
 * References:
 * - https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing
 * - https://cwe.mitre.org/data/definitions/611.html (XXE)
 *
 * @module processors/data/XmlProcessor
 *
 * @example
 * ```typescript
 * import { xmlProcessor, isXmlFile, processXml } from "./XmlProcessor.js";
 *
 * // Check if file is XML
 * if (isXmlFile("application/xml", "data.xml")) {
 *   // Process the file
 *   const result = await processXml(fileInfo);
 *   if (result.success && result.data) {
 *     console.log("Root element:", result.data.rootElement);
 *     console.log("Parsed:", result.data.parsed);
 *   }
 * }
 * ```
 */

import { createRequire } from "node:module";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  OperationResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS_MB } from "../config/index.js";
import { createFileError, FileErrorCode } from "../errors/index.js";

const require = createRequire(import.meta.url);

// =============================================================================
// TYPES
// =============================================================================

export type { ProcessedXml } from "../base/types.js";

// Re-import for local use within this file
import type { ProcessedXml } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported XML MIME types */
const SUPPORTED_XML_TYPES = ["application/xml", "text/xml"];

/** Supported XML file extensions */
const SUPPORTED_XML_EXTENSIONS = [".xml"];

// =============================================================================
// XML PROCESSOR CLASS
// =============================================================================

/**
 * XML file processor.
 * Extends BaseFileProcessor with XML-specific parsing and validation.
 *
 * Features:
 * - XXE protection (rejects DOCTYPE and ENTITY declarations)
 * - Parses XML to JavaScript objects
 * - Extracts root element name
 *
 * @example
 * ```typescript
 * const processor = new XmlProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: "data.xml",
 *   mimetype: "application/xml",
 *   size: 1024,
 *   buffer: xmlBuffer,
 * });
 *
 * if (result.success && result.data?.valid) {
 *   console.log("Root element:", result.data.rootElement);
 * }
 * ```
 */
export class XmlProcessor extends BaseFileProcessor<ProcessedXml> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS_MB.XML_MAX_MB,
      timeoutMs: 30000,
      supportedMimeTypes: SUPPORTED_XML_TYPES,
      supportedExtensions: SUPPORTED_XML_EXTENSIONS,
      fileTypeName: "XML",
      defaultFilename: "data.xml",
    });
  }

  /**
   * Extract the root element name from XML content.
   *
   * @param content - XML content string
   * @returns Root element name or undefined if not found
   */
  private extractRootElement(content: string): string | undefined {
    // Skip XML declaration and comments, then find first element
    const elementMatch = content.match(/<([a-zA-Z][a-zA-Z0-9_:-]*)[>\s/]/);
    return elementMatch?.[1];
  }

  /**
   * Check if XML content contains XXE attack vectors.
   *
   * @param content - XML content string
   * @returns Object with detection results
   */
  private checkXxeVectors(content: string): {
    hasDOCTYPE: boolean;
    hasENTITY: boolean;
  } {
    const lower = content.toLowerCase();
    return {
      hasDOCTYPE: lower.includes("<!doctype"),
      hasENTITY: lower.includes("<!entity"),
    };
  }

  /**
   * Parse XML content to JavaScript object securely.
   *
   * @param content - XML content string
   * @returns Parsed XML content
   */
  private parseXmlSecurely(content: string): unknown {
    // Dynamically import fast-xml-parser
    const { XMLParser } = require("fast-xml-parser");

    // Initialize XML parser with sensible defaults
    // XXE Protection: Disable entity processing to prevent XML External Entity attacks
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
      // XXE Protection - explicitly disable entity processing
      processEntities: false,
      htmlEntities: false,
    });

    return parser.parse(content);
  }

  /**
   * Validate downloaded XML is parseable and safe with structured error result.
   * Includes XXE protection by rejecting XML with DOCTYPE or ENTITY declarations.
   * Returns user-friendly error messages with actionable suggestions.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Success result or error result
   */
  protected override async validateDownloadedFileWithResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): Promise<OperationResult<void>> {
    try {
      const content = buffer.toString("utf-8");

      // XXE Protection: Check for potentially dangerous DOCTYPE/ENTITY declarations
      const { hasDOCTYPE, hasENTITY } = this.checkXxeVectors(content);

      if (hasDOCTYPE || hasENTITY) {
        const error = createFileError(FileErrorCode.XXE_DETECTED, {
          hasDOCTYPE,
          hasENTITY,
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

      // Parse to validate structure
      this.parseXmlSecurely(content);
      return { success: true, data: undefined };
    } catch (error) {
      const fileError = createFileError(
        FileErrorCode.PARSING_FAILED,
        { fileType: "XML" },
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
   * Build processed XML result with parsed content.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed XML result
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedXml {
    const content = buffer.toString("utf-8");
    let parsed: unknown = null;
    let valid = true;
    let errorMessage: string | undefined;

    // Extract root element
    const rootElement = this.extractRootElement(content);

    try {
      parsed = this.parseXmlSecurely(content);
    } catch (error) {
      // This shouldn't happen since we validate, but handle gracefully
      valid = false;
      errorMessage = error instanceof Error ? error.message : "Invalid XML";
    }

    return {
      content,
      parsed,
      valid,
      errorMessage,
      rootElement,
      buffer,
      mimetype: fileInfo.mimetype || "application/xml",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Singleton XML processor instance */
export const xmlProcessor = new XmlProcessor();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a file is an XML file based on MIME type or extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is an XML file
 *
 * @example
 * ```typescript
 * if (isXmlFile("application/xml", "data.xml")) {
 *   // Process as XML
 * }
 * ```
 */
export function isXmlFile(mimetype: string, filename: string): boolean {
  return xmlProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate XML file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the limit
 */
export function validateXmlSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS_MB.XML_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single XML file with XXE protection.
 *
 * @param fileInfo - File information (with URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with parsed XML or error
 *
 * @example
 * ```typescript
 * const result = await processXml({
 *   id: "file-123",
 *   name: "data.xml",
 *   mimetype: "application/xml",
 *   size: 2048,
 *   url: "https://example.com/data.xml",
 * }, {
 *   authHeaders: { "Authorization": "Bearer token" },
 * });
 *
 * if (result.success && result.data) {
 *   console.log("Root:", result.data.rootElement);
 *   console.log("Parsed:", result.data.parsed);
 * }
 * ```
 */
export function processXml(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedXml>> {
  return xmlProcessor.processFile(fileInfo, options);
}
