/**
 * Document Loaders
 *
 * Provides loaders for various document formats including:
 * - Text files
 * - Markdown files
 * - HTML files and web pages
 * - JSON files
 * - CSV files
 * - PDF files
 *
 * @example
 * ```typescript
 * import { loadDocument, WebLoader, PDFLoader } from 'neurolink/rag';
 *
 * // Load from file path
 * const doc = await loadDocument('/path/to/document.md');
 *
 * // Load from URL
 * const webDoc = await WebLoader.load('https://example.com/article');
 *
 * // Load PDF
 * const pdfDoc = await PDFLoader.load('/path/to/document.pdf');
 * ```
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { basename, extname } from "path";
import { logger } from "../../utils/logger.js";
import type { DocumentType } from "../types.js";
import { MDocument } from "./MDocument.js";
import type {
  LoaderOptions,
  WebLoaderOptions,
  PDFLoaderOptions,
  CSVLoaderOptions,
  DocumentLoader,
} from "../../types/ragTypes.js";

export type { LoaderOptions } from "../../types/ragTypes.js";
export type { WebLoaderOptions } from "../../types/ragTypes.js";
export type { PDFLoaderOptions } from "../../types/ragTypes.js";
export type { CSVLoaderOptions } from "../../types/ragTypes.js";
export type { DocumentLoader } from "../../types/ragTypes.js";

/**
 * Text file loader
 */
export class TextLoader implements DocumentLoader {
  async load(source: string, options?: LoaderOptions): Promise<MDocument> {
    const content = await this.loadContent(source, options?.encoding);
    return MDocument.fromText(content, {
      source: this.getSourceName(source),
      ...options?.metadata,
    });
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".txt" || ext === "";
  }

  protected async loadContent(
    source: string,
    encoding: BufferEncoding = "utf-8",
  ): Promise<string> {
    if (existsSync(source)) {
      return await readFile(source, encoding);
    }
    // Assume source is content if not a file
    return source;
  }

  protected getSourceName(source: string): string {
    return existsSync(source) ? basename(source) : "inline-content";
  }
}

/**
 * Markdown file loader
 */
export class MarkdownLoader extends TextLoader {
  async load(source: string, options?: LoaderOptions): Promise<MDocument> {
    const content = await this.loadContent(source, options?.encoding);
    return MDocument.fromMarkdown(content, {
      source: this.getSourceName(source),
      ...options?.metadata,
    });
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".md" || ext === ".markdown" || ext === ".mdx";
  }
}

/**
 * HTML file loader
 */
export class HTMLLoader extends TextLoader {
  async load(source: string, options?: LoaderOptions): Promise<MDocument> {
    const content = await this.loadContent(source, options?.encoding);
    return MDocument.fromHTML(content, {
      source: this.getSourceName(source),
      ...options?.metadata,
    });
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".html" || ext === ".htm" || ext === ".xhtml";
  }
}

/**
 * JSON file loader
 */
export class JSONLoader extends TextLoader {
  async load(source: string, options?: LoaderOptions): Promise<MDocument> {
    const content = await this.loadContent(source, options?.encoding);

    // Validate JSON
    try {
      JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return MDocument.fromJSONContent(content, {
      source: this.getSourceName(source),
      ...options?.metadata,
    });
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".json" || ext === ".jsonl";
  }
}

/**
 * CSV file loader
 */
export class CSVLoader extends TextLoader {
  async load(source: string, options?: CSVLoaderOptions): Promise<MDocument> {
    const content = await this.loadContent(source, options?.encoding);
    const {
      delimiter = ",",
      hasHeader = true,
      columns,
      outputFormat = "text",
    } = options || {};

    const lines = content.split("\n").filter((line) => line.trim());
    const headers = hasHeader
      ? this.parseCSVLine(lines[0], delimiter)
      : columns || lines[0]?.split(delimiter).map((_, i) => `col${i + 1}`);

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = dataLines.map((line) => this.parseCSVLine(line, delimiter));

    let formattedContent: string;

    switch (outputFormat) {
      case "json":
        formattedContent = JSON.stringify(
          rows.map((row) =>
            Object.fromEntries(headers.map((h, i) => [h, row[i]])),
          ),
          null,
          2,
        );
        break;

      case "markdown":
        formattedContent = this.toMarkdownTable(headers, rows);
        break;

      default:
        formattedContent = this.toTextTable(headers, rows);
    }

    return MDocument.fromCSV(formattedContent, {
      source: this.getSourceName(source),
      rowCount: rows.length,
      columnCount: headers.length,
      columns: headers,
      ...options?.metadata,
    });
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".csv" || ext === ".tsv";
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private toMarkdownTable(headers: string[], rows: string[][]): string {
    const headerRow = `| ${headers.join(" | ")} |`;
    const separator = `| ${headers.map(() => "---").join(" | ")} |`;
    const dataRows = rows.map((row) => `| ${row.join(" | ")} |`);
    return [headerRow, separator, ...dataRows].join("\n");
  }

  private toTextTable(headers: string[], rows: string[][]): string {
    const allRows = [headers, ...rows];
    const colWidths = headers.map((_, i) =>
      Math.max(...allRows.map((row) => (row[i] || "").length)),
    );

    const formatRow = (row: string[]) =>
      row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join(" | ");

    return [
      formatRow(headers),
      colWidths.map((w) => "-".repeat(w)).join("-+-"),
      ...rows.map(formatRow),
    ].join("\n");
  }
}

/**
 * PDF file loader
 *
 * Note: Requires external PDF processing library for full functionality.
 * Falls back to placeholder implementation if pdf-parse is not available.
 */
export class PDFLoader implements DocumentLoader {
  async load(source: string, options?: PDFLoaderOptions): Promise<MDocument> {
    if (!existsSync(source)) {
      throw new Error(`PDF file not found: ${source}`);
    }

    logger.debug("[PDFLoader] Loading PDF", {
      source,
      pageRange: options?.pageRange,
    });

    try {
      // Try to use pdf-parse if available
      const pdfParse = await this.loadPdfParser();
      const buffer = await readFile(source);
      const data = await pdfParse(buffer);

      const text = data.text;

      // Handle page range if specified
      if (options?.pageRange) {
        const _pages = this.parsePageRange(options.pageRange, data.numpages);
        // Note: pdf-parse doesn't support page selection directly
        // This is a placeholder for more sophisticated page handling
        logger.debug(
          "[PDFLoader] Page range requested but not fully supported",
          {
            pageRange: options.pageRange,
            totalPages: data.numpages,
          },
        );
      }

      return new MDocument(text, {
        type: "pdf",
        metadata: {
          source: basename(source),
          pageCount: data.numpages,
          info: data.info,
          ...options?.metadata,
        },
      });
    } catch (error) {
      // Fallback: Return placeholder document
      logger.warn("[PDFLoader] pdf-parse not available, using fallback", {
        error: error instanceof Error ? error.message : String(error),
      });

      return new MDocument(
        `[PDF Document: ${basename(source)}]\n\nNote: PDF parsing requires the 'pdf-parse' package. Install it with:\n  npm install pdf-parse`,
        {
          type: "pdf",
          metadata: {
            source: basename(source),
            parseError: "pdf-parse not available",
            ...options?.metadata,
          },
        },
      );
    }
  }

  canHandle(source: string): boolean {
    const ext = extname(source).toLowerCase();
    return ext === ".pdf";
  }

  private async loadPdfParser(): Promise<
    (buffer: Buffer) => Promise<{
      text: string;
      numpages: number;
      info: Record<string, unknown>;
    }>
  > {
    try {
      // pdf-parse is an optional dependency - use dynamic import with type assertion
      const pdfParse = (await import("pdf-parse")) as unknown as {
        default?: (dataBuffer: Buffer) => Promise<{
          numpages: number;
          text: string;
          info: Record<string, unknown>;
        }>;
      } & ((dataBuffer: Buffer) => Promise<{
        numpages: number;
        text: string;
        info: Record<string, unknown>;
      }>);
      return pdfParse.default || pdfParse;
    } catch {
      throw new Error("pdf-parse module not available");
    }
  }

  private parsePageRange(range: string, totalPages: number): number[] {
    const pages: number[] = [];
    const parts = range.split(",");

    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        for (let i = start; i <= Math.min(end, totalPages); i++) {
          pages.push(i);
        }
      } else {
        const page = Number(part);
        if (page <= totalPages) {
          pages.push(page);
        }
      }
    }

    return [...new Set(pages)].sort((a, b) => a - b);
  }
}

/**
 * Web page loader
 *
 * Fetches and extracts content from web pages.
 * Supports basic HTML parsing without external dependencies.
 */
export class WebLoader implements DocumentLoader {
  private defaultUserAgent =
    "Mozilla/5.0 (compatible; NeuroLink/1.0; +https://github.com/juspay/neurolink)";

  async load(source: string, options?: WebLoaderOptions): Promise<MDocument> {
    if (!this.canHandle(source)) {
      throw new Error(`Invalid URL: ${source}`);
    }

    logger.debug("[WebLoader] Fetching URL", {
      url: source,
      timeout: options?.timeout,
    });

    const response = await fetch(source, {
      signal: options?.timeout
        ? AbortSignal.timeout(options.timeout)
        : undefined,
      headers: {
        "User-Agent": options?.userAgent || this.defaultUserAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    let content = html;

    // Extract main content if requested
    if (options?.extractMainContent) {
      content = this.extractMainContent(html, options.contentSelector);
    }

    // Convert HTML to plain text for better processing
    const text = this.htmlToText(content);

    return new MDocument(text, {
      type: "html",
      metadata: {
        source,
        url: source,
        fetchedAt: new Date().toISOString(),
        contentType: response.headers.get("content-type") || "text/html",
        ...options?.metadata,
      },
    });
  }

  canHandle(source: string): boolean {
    try {
      const url = new URL(source);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Extract main content from HTML
   */
  private extractMainContent(html: string, selector?: string): string {
    // Simple extraction based on common content patterns
    // For production use, consider using a library like cheerio

    // Try to extract content from common containers
    const patterns = selector
      ? [`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`]
      : [
          /<main[^>]*>([\s\S]*?)<\/main>/i,
          /<article[^>]*>([\s\S]*?)<\/article>/i,
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i,
          /<body[^>]*>([\s\S]*?)<\/body>/i,
        ];

    for (const pattern of patterns) {
      const match = html.match(new RegExp(pattern, "i"));
      if (match) {
        return match[1] || match[0];
      }
    }

    return html;
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return (
      html
        // Remove script and style elements
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, "")
        // Replace common block elements with newlines
        .replace(/<\/(p|div|h[1-6]|br|li|tr|blockquote)>/gi, "\n")
        .replace(/<(br|hr)\s*\/?>/gi, "\n")
        // Remove remaining tags
        .replace(/<[^>]+>/g, "")
        // Decode common HTML entities
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#039;/gi, "'")
        .replace(/&apos;/gi, "'")
        // Decode numeric entities
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        // Normalize whitespace
        .replace(/\n\s*\n/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim()
    );
  }
}

/**
 * Registry of document loaders
 */
const loaderRegistry: DocumentLoader[] = [
  new MarkdownLoader(),
  new HTMLLoader(),
  new JSONLoader(),
  new CSVLoader(),
  new PDFLoader(),
  new WebLoader(),
  new TextLoader(), // Default fallback
];

/**
 * Detect document type from source
 */
function _detectDocumentType(source: string): DocumentType {
  const ext = extname(source).toLowerCase();
  const typeMap: Record<string, DocumentType> = {
    ".md": "markdown",
    ".markdown": "markdown",
    ".mdx": "markdown",
    ".html": "html",
    ".htm": "html",
    ".xhtml": "html",
    ".json": "json",
    ".jsonl": "json",
    ".csv": "csv",
    ".tsv": "csv",
    ".tex": "latex",
    ".latex": "latex",
    ".pdf": "pdf",
  };

  // Check if it's a URL
  try {
    const url = new URL(source);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return "html";
    }
  } catch {
    // Not a URL
  }

  return typeMap[ext] || "text";
}

/**
 * Load document from file path, URL, or content
 *
 * Automatically detects the document type and uses the appropriate loader.
 *
 * @param source - File path, URL, or raw content
 * @param options - Loader options
 * @returns Promise resolving to MDocument
 *
 * @example
 * ```typescript
 * // Load from file
 * const doc = await loadDocument('/path/to/document.md');
 *
 * // Load from URL
 * const webDoc = await loadDocument('https://example.com/article');
 *
 * // Load with options
 * const pdfDoc = await loadDocument('/path/to/doc.pdf', {
 *   pageRange: '1-5',
 *   metadata: { project: 'research' }
 * });
 * ```
 */
export async function loadDocument(
  source: string,
  options?: LoaderOptions,
): Promise<MDocument> {
  // Find appropriate loader
  const loader = loaderRegistry.find((l) => l.canHandle(source));

  if (!loader) {
    // Fall back to text loader
    return new TextLoader().load(source, options);
  }

  logger.debug("[loadDocument] Loading document", {
    source: source.slice(0, 100),
    loaderType: loader.constructor.name,
  });

  return loader.load(source, options);
}

/**
 * Load multiple documents
 *
 * @param sources - Array of file paths, URLs, or content
 * @param options - Loader options (applied to all)
 * @returns Promise resolving to array of MDocuments
 */
export async function loadDocuments(
  sources: string[],
  options?: LoaderOptions,
): Promise<MDocument[]> {
  const results = await Promise.allSettled(
    sources.map((source) => loadDocument(source, options)),
  );

  const documents: MDocument[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      documents.push(result.value);
    } else {
      errors.push({
        source: sources[index],
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  });

  if (errors.length > 0) {
    logger.warn("[loadDocuments] Some documents failed to load", {
      loaded: documents.length,
      failed: errors.length,
      errors,
    });
  }

  return documents;
}
