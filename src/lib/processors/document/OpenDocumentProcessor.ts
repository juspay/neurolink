/**
 * OpenDocument Processor
 *
 * Processes OpenDocument format files (.odt, .ods, .odp) by extracting
 * text content from the internal XML structure.
 *
 * @module processors/document/OpenDocumentProcessor
 */

import { createRequire } from "node:module";
import * as zlib from "node:zlib";

import {
  BaseFileProcessor,
  contentTooLargeError,
  isContentTooLarge,
} from "../base/BaseFileProcessor.js";
import { readZipEntryWithinLimit } from "../archive/zipEntryReader.js";
import type {
  FileInfo,
  ProcessorFileProcessingResult,
  ProcessOptions,
  ProcessedOpenDocument,
} from "../../types/index.js";
import { SIZE_LIMITS } from "../config/index.js";

const require = createRequire(import.meta.url);

// Re-import for local use within this file

/**
 * OpenDocument Processor - handles .odt, .ods, .odp files
 *
 * OpenDocument files are ZIP archives containing XML content.
 * The main content is in content.xml within the archive.
 *
 * Priority: ~105 (between Word and Text)
 */
export class OpenDocumentProcessor extends BaseFileProcessor<ProcessedOpenDocument> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.DOCUMENT_MAX_MB,
      timeoutMs: 60000,
      supportedMimeTypes: [
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
      ],
      supportedExtensions: [".odt", ".ods", ".odp"],
      fileTypeName: "OpenDocument",
      defaultFilename: "document.odt",
    });
  }

  /**
   * Validate that the file is a valid ZIP archive (OpenDocument format)
   */
  protected async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    if (buffer.length < 4) {
      return "File too small to be a valid OpenDocument file";
    }

    // Check for PK (ZIP) signature
    const signature = buffer.subarray(0, 2).toString("ascii");
    if (signature !== "PK") {
      return "Invalid OpenDocument format - not a valid ZIP archive";
    }

    return null;
  }

  /**
   * Build the processed result by extracting content from the OpenDocument
   */
  protected buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedOpenDocument {
    const ext = this.getExtension(fileInfo.name);
    const format = this.detectFormat(ext);

    let textContent: string;
    let paragraphCount: number;
    let truncated = false;

    try {
      // Dynamically import adm-zip to avoid issues if not available
      const AdmZip = require("adm-zip");
      const zip = new AdmZip(buffer);

      // Try to get content.xml
      const contentEntry = zip.getEntry("content.xml");
      if (contentEntry) {
        // Bounded rather than `getData()`: an ODF file is a ZIP, so its
        // content.xml can declare any uncompressed size it likes, and
        // `maxSizeMB` only ever saw the compressed archive on the way in.
        const read = readZipEntryWithinLimit(
          contentEntry,
          SIZE_LIMITS.DOCUMENT_MAX_MB * 1024 * 1024,
          zlib,
        );
        if (read.status === "too-large") {
          // Coded, so the bound surfaces as FILE_TOO_LARGE (not retryable)
          // rather than PROCESSING_FAILED (retryable). The file will be
          // exactly as oversized on the next attempt.
          throw contentTooLargeError(
            `content.xml in "${this.getFilename(fileInfo)}" exceeds the ${SIZE_LIMITS.DOCUMENT_MAX_MB}MB limit for OpenDocument content`,
          );
        }
        if (read.status !== "ok") {
          throw new Error("content.xml could not be read from the archive");
        }
        const xmlContent = read.buffer.toString("utf-8");
        const extracted = this.extractTextFromXml(xmlContent);
        textContent = extracted.text;
        paragraphCount = extracted.paragraphCount;

        // Check for truncation
        const maxChars = 500000; // ~500KB of text
        if (textContent.length > maxChars) {
          textContent =
            textContent.substring(0, maxChars) + "\n\n... [Content truncated]";
          truncated = true;
        }
      } else {
        throw new Error("content.xml not found in OpenDocument archive");
      }
    } catch (error) {
      // A size verdict passes through intact. Re-wrapping it as a plain Error
      // drops the code, and the base class then reports PROCESSING_FAILED —
      // which is retryable, so the caller would refetch and decompress a file
      // guaranteed to be exactly as oversized.
      if (isContentTooLarge(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to extract OpenDocument content: ${message}`, {
        cause: error,
      });
    }

    return {
      textContent,
      format,
      paragraphCount,
      truncated,
      buffer,
      mimetype: fileInfo.mimetype || "application/vnd.oasis.opendocument.text",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  /**
   * Decode HTML entities in a single pass to prevent double-unescaping.
   * Sequential replacement is vulnerable: "&amp;lt;" → "&lt;" → "<"
   * Single-pass avoids this by replacing each entity exactly once.
   */
  private decodeHtmlEntities(text: string): string {
    const entityMap: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
    };
    return text.replace(
      /&(?:amp|lt|gt|quot|apos);/g,
      (match) => entityMap[match] ?? match,
    );
  }

  /**
   * Extract text content from OpenDocument XML
   */
  private extractTextFromXml(xml: string): {
    text: string;
    paragraphCount: number;
  } {
    const paragraphs: string[] = [];

    // Extract text from <text:p> elements (paragraphs)
    // Also handle <text:h> (headings) and <text:span> (spans)
    const textPattern =
      /<text:(?:p|h|span)[^>]*>([\s\S]*?)<\/text:(?:p|h|span)>/gi;
    const matches = xml.matchAll(textPattern);

    for (const match of matches) {
      // Remove nested tags iteratively to handle fragments like "<scr<script>ipt>"
      let stripped = match[1];
      let prev: string;
      do {
        prev = stripped;
        stripped = stripped.replace(/<[^>]+>/g, "");
      } while (stripped !== prev);
      const text = this.decodeHtmlEntities(stripped).trim();

      if (text) {
        paragraphs.push(text);
      }
    }

    // Also try a simpler approach for spreadsheets and presentations
    // where content might be in different structures
    if (paragraphs.length === 0) {
      // Try to extract any text content between tags (iterative to handle nested fragments)
      let stripped = xml;
      let prev: string;
      do {
        prev = stripped;
        stripped = stripped.replace(/<[^>]+>/g, " ");
      } while (stripped !== prev);
      const simpleText = this.decodeHtmlEntities(
        stripped.replace(/\s+/g, " "),
      ).trim();

      if (simpleText) {
        paragraphs.push(simpleText);
      }
    }

    return {
      text: paragraphs.join("\n\n"),
      paragraphCount: paragraphs.length,
    };
  }

  /**
   * Detect the OpenDocument format from file extension
   */
  private detectFormat(ext: string | null): ProcessedOpenDocument["format"] {
    switch (ext?.toLowerCase()) {
      case ".odt":
        return "odt";
      case ".ods":
        return "ods";
      case ".odp":
        return "odp";
      default:
        return "unknown";
    }
  }

  /**
   * Get file extension from filename
   */
  private getExtension(filename: string): string | null {
    const match = filename.toLowerCase().match(/\.[^.]+$/);
    return match ? match[0] : null;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton instance of OpenDocumentProcessor
 */
export const openDocumentProcessor = new OpenDocumentProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an OpenDocument file by MIME type or extension
 */
export function isOpenDocumentFile(
  mimetype: string,
  filename: string,
): boolean {
  return openDocumentProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate OpenDocument file size against limits
 */
export function validateOpenDocumentSize(sizeBytes: number): boolean {
  return sizeBytes <= SIZE_LIMITS.DOCUMENT_MAX_MB * 1024 * 1024;
}

/**
 * Process an OpenDocument file
 */
export async function processOpenDocument(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<ProcessorFileProcessingResult<ProcessedOpenDocument>> {
  return openDocumentProcessor.processFile(fileInfo, options);
}

/**
 * Get the maximum allowed OpenDocument file size in MB
 */
export function getOpenDocumentMaxSizeMB(): number {
  return SIZE_LIMITS.DOCUMENT_MAX_MB;
}
