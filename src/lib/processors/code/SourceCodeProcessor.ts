/**
 * Source Code Processor
 *
 * Processes source code files for 50+ programming languages.
 * Uses extension-based detection as primary method (more reliable than MIME types for code).
 *
 * Key features:
 * - Supports 50+ programming languages via extension detection
 * - Handles exact filename matches (Dockerfile, Makefile, etc.)
 * - Line count truncation to prevent token overflow
 * - Language detection for syntax highlighting metadata
 *
 * Priority: 120 (lower priority - text-based content, processed after binary/document formats)
 *
 * @module processors/code/SourceCodeProcessor
 *
 * @example
 * ```typescript
 * import { sourceCodeProcessor, processSourceCode, isSourceCodeFile } from "./code/index.js";
 *
 * // Check if a file is source code
 * if (isSourceCodeFile("text/plain", "app.ts")) {
 *   const result = await processSourceCode({
 *     id: "file-123",
 *     name: "app.ts",
 *     mimetype: "text/plain",
 *     size: 1024,
 *     buffer: codeBuffer,
 *   });
 *
 *   if (result.success) {
 *     console.log(`Language: ${result.data.language}`);
 *     console.log(`Lines: ${result.data.lineCount}`);
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
import {
  EXACT_FILENAME_MAP,
  SIZE_LIMITS,
  SOURCE_CODE_EXTENSIONS,
} from "../config/index.js";
import { detectLanguageFromFilename } from "../config/languageMap.js";

// =============================================================================
// TYPES
// =============================================================================

export type { ProcessedSourceCode } from "../base/types.js";

// Re-import for local use within this file
import type { ProcessedSourceCode } from "../base/types.js";

// =============================================================================
// SOURCE CODE PROCESSOR
// =============================================================================

/**
 * Source Code Processor - handles 50+ programming languages.
 *
 * Uses extension-based detection as the primary method since MIME types
 * for source code are often unreliable (many are just "text/plain").
 *
 * Priority: 120 (lower priority than binary/document formats)
 *
 * @example
 * ```typescript
 * const processor = new SourceCodeProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: "main.py",
 *   mimetype: "text/plain",
 *   size: 2048,
 *   buffer: pythonCodeBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(`Language: ${result.data.language}`); // "Python"
 * }
 * ```
 */
export class SourceCodeProcessor extends BaseFileProcessor<ProcessedSourceCode> {
  /**
   * Supported file extensions for source code.
   * Includes 50+ extensions covering all major programming languages.
   */
  private static readonly supportedExtensions: string[] = [
    ...SOURCE_CODE_EXTENSIONS,
  ];

  /**
   * Common MIME types for source code files.
   * Note: Extension-based detection is preferred as MIME types are often unreliable.
   */
  private static readonly supportedMimeTypes: string[] = [
    "text/plain",
    "text/x-python",
    "text/javascript",
    "text/typescript",
    "application/javascript",
    "application/typescript",
    "application/x-javascript",
    "text/x-java",
    "text/x-java-source",
    "text/x-c",
    "text/x-csrc",
    "text/x-c++",
    "text/x-c++src",
    "text/x-csharp",
    "text/x-go",
    "text/x-rust",
    "text/x-ruby",
    "text/x-php",
    "text/x-sh",
    "text/x-shellscript",
    "application/x-sh",
    "text/x-perl",
    "text/x-lua",
    "text/x-sql",
    "text/x-swift",
    "text/x-kotlin",
    "text/x-scala",
    "text/x-haskell",
    "text/x-elixir",
    "text/x-erlang",
    "text/x-clojure",
    "text/x-fsharp",
    "text/x-ocaml",
    "text/x-lisp",
    "text/x-scheme",
    "text/x-groovy",
    "text/x-powershell",
    "text/x-r",
    "text/x-julia",
    "text/x-nim",
    "text/x-zig",
    "text/x-dart",
    "text/x-crystal",
    "text/x-d",
    "text/x-asm",
    "text/x-fortran",
    "text/x-cobol",
    "text/x-pascal",
    "text/x-ada",
    "text/css",
    "text/x-scss",
    "text/x-sass",
    "text/x-less",
    "application/x-httpd-php",
  ];

  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.SOURCE_CODE_MAX_MB,
      timeoutMs: 30000,
      supportedMimeTypes: SourceCodeProcessor.supportedMimeTypes,
      supportedExtensions: SourceCodeProcessor.supportedExtensions,
      fileTypeName: "SourceCode",
      defaultFilename: "code.txt",
    });
  }

  /**
   * Override to use extension-based detection as primary method.
   * Source code MIME types are often unreliable (e.g., "text/plain" for .ts files),
   * so we check extensions first.
   *
   * Also handles exact filename matches for special files like Dockerfile, Makefile.
   *
   * @param mimetype - MIME type of the file (often unreliable for source code)
   * @param filename - Filename for extension-based detection
   * @returns true if the file is a supported source code file
   */
  public override isFileSupported(mimetype: string, filename: string): boolean {
    if (!filename) {
      return false;
    }

    // Check exact filename matches first (Dockerfile, Makefile, etc.)
    if (EXACT_FILENAME_MAP[filename]) {
      return true;
    }

    // Also check basename for exact matches (in case full path is passed)
    const basename = pathBasename(filename);
    if (EXACT_FILENAME_MAP[basename]) {
      return true;
    }

    // Check by extension (more reliable for source code than MIME type)
    const ext = this.getExtension(filename);
    if (
      ext &&
      SourceCodeProcessor.supportedExtensions.includes(ext.toLowerCase())
    ) {
      return true;
    }

    // Fall back to MIME type check
    return super.isFileSupported(mimetype, filename);
  }

  /**
   * Build the processed source code result.
   * Decodes the buffer as UTF-8, detects language, and truncates if needed.
   *
   * @param buffer - Raw file content
   * @param fileInfo - Original file information
   * @returns Processed source code with metadata
   */
  protected buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedSourceCode {
    const content = buffer.toString("utf-8");
    const lines = content.split("\n");
    const originalLineCount = lines.length;
    const language = detectLanguageFromFilename(fileInfo.name || "");
    const maxLines = SIZE_LIMITS.MAX_SOURCE_CODE_LINES;

    // Truncate if too many lines
    let finalContent = content;
    let truncated = false;

    if (lines.length > maxLines) {
      truncated = true;
      finalContent = lines.slice(0, maxLines).join("\n");
      finalContent += `\n\n// ... truncated at ${maxLines} lines, total ${originalLineCount} lines ...`;
    }

    return {
      content: finalContent,
      language,
      lineCount: Math.min(lines.length, maxLines),
      truncated,
      encoding: "utf-8",
      buffer,
      mimetype: fileInfo.mimetype || "text/plain",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  /**
   * Extract file extension from filename.
   *
   * @param filename - Filename to extract extension from
   * @returns Extension with leading dot (e.g., ".ts") or null if no extension
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
 * Singleton instance of the SourceCodeProcessor.
 * Use this for all source code processing to share configuration.
 */
export const sourceCodeProcessor = new SourceCodeProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a source code file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename for extension-based detection
 * @returns true if the file is a supported source code file
 *
 * @example
 * ```typescript
 * if (isSourceCodeFile("text/plain", "app.ts")) {
 *   console.log("This is a TypeScript file");
 * }
 * ```
 */
export function isSourceCodeFile(mimetype: string, filename: string): boolean {
  return sourceCodeProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate source code file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if the file size is within limits
 */
export function validateSourceCodeSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.SOURCE_CODE_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a source code file.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options
 * @returns Processing result with success flag and either data or error
 *
 * @example
 * ```typescript
 * const result = await processSourceCode({
 *   id: "file-123",
 *   name: "main.py",
 *   mimetype: "text/plain",
 *   size: 2048,
 *   buffer: pythonCodeBuffer,
 * });
 *
 * if (result.success) {
 *   console.log(`Detected language: ${result.data.language}`);
 *   console.log(`Line count: ${result.data.lineCount}`);
 *   console.log(`Truncated: ${result.data.truncated}`);
 * }
 * ```
 */
export async function processSourceCode(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedSourceCode>> {
  return sourceCodeProcessor.processFile(fileInfo, options);
}

/**
 * Alias for backward compatibility with Curator codebase.
 * Detects programming language from a filename.
 *
 * @param filename - The filename to detect language from
 * @returns The detected language name or 'Unknown'
 *
 * @example
 * ```typescript
 * detectLanguage("app.ts") // Returns "TypeScript"
 * detectLanguage("Dockerfile") // Returns "Dockerfile"
 * ```
 */
export const detectLanguage = detectLanguageFromFilename;
