/**
 * CSV Processing Utility
 * Converts CSV files to LLM-friendly text formats
 * Uses streaming for memory efficiency with large files
 */

import csvParser from "csv-parser";
import { Readable } from "stream";
import { logger } from "./logger.js";
import type {
  FileProcessingResult,
  CSVProcessorOptions,
  SampleDataFormat,
} from "../types/fileTypes.js";

/**
 * Sanitize column name to be a valid JavaScript identifier
 * Handles special characters, spaces, and names starting with numbers
 * Converts to camelCase for consistency
 *
 * @param columnName - Original column name from CSV
 * @returns Sanitized column name safe to use as object key
 *
 * @example
 * sanitizeColumnName("Price ($)") // => "priceDollar"
 * sanitizeColumnName("1st Place") // => "firstPlace"
 * sanitizeColumnName("Name/Title") // => "nameTitle"
 * sanitizeColumnName("  Spaces  ") // => "spaces"
 */
function sanitizeColumnName(columnName: string): string {
  // Trim whitespace
  let sanitized = columnName.trim();

  // Handle empty column names
  if (!sanitized) {
    return "column";
  }

  // Convert special patterns to words (add spaces to separate from adjacent words)
  sanitized = sanitized
    .replace(/\$/g, " Dollar ")
    .replace(/€/g, " Euro ")
    .replace(/£/g, " Pound ")
    .replace(/¥/g, " Yen ")
    .replace(/%/g, " Percent ")
    .replace(/#/g, " Number ")
    .replace(/&/g, " And ")
    .replace(/@/g, " At ");

  // Handle number prefixes (e.g., "1st" -> "first", "2nd" -> "second")
  sanitized = sanitized
    .replace(/^1st\b/i, "first")
    .replace(/^2nd\b/i, "second")
    .replace(/^3rd\b/i, "third")
    .replace(/^(\d+)\b/, "num$1"); // Handles all other numeric prefixes

  // Remove or replace invalid characters (keep only alphanumeric and spaces)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, " ");

  // Split on whitespace and convert to camelCase
  const words = sanitized
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });

  // Join words
  const result = words.join("");

  // Ensure result starts with letter or underscore (fallback if starts with number)
  if (result && /^[0-9]/.test(result)) {
    return "col" + result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result || "column";
}

/**
 * Sanitize row object keys (column names)
 * Creates a new object with sanitized keys and stores original column names
 *
 * @param row - Original row object from csv-parser
 * @param columnMapping - Map of original to sanitized column names
 * @returns Row with sanitized column names
 */
function sanitizeRowKeys(
  row: Record<string, unknown>,
  columnMapping: Map<string, string>,
): Record<string, unknown> {
  const sanitizedRow: Record<string, unknown> = {};

  for (const [originalKey, value] of Object.entries(row)) {
    const sanitizedKey = columnMapping.get(originalKey) || originalKey;
    sanitizedRow[sanitizedKey] = value;
  }

  return sanitizedRow;
}

/**
 * Count field separators (commas outside quotes) in a CSV line
 * Properly handles quoted fields with commas inside
 */
function countFieldSeparators(line: string): number {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Check if this is an escaped quote ""
      if (i + 1 < line.length && line[i + 1] === '"') {
        i++; // Skip the next quote
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      count++;
    }
  }

  return count;
}

/**
 * Detect if first line is CSV metadata (not actual data/headers)
 * Common patterns:
 * - Excel separator line: "SEP=,"
 * - Lines with significantly different delimiter count than line 2
 * - Lines that don't match CSV structure of subsequent lines
 */
function isMetadataLine(lines: string[]): boolean {
  if (!lines[0] || lines.length < 2) {
    return false;
  }

  const firstLine = lines[0].trim();
  const secondLine = lines[1].trim();

  if (firstLine.match(/^sep=/i)) {
    return true;
  }

  // Use proper CSV field counting (handles quotes)
  const firstCommaCount = countFieldSeparators(firstLine);
  const secondCommaCount = countFieldSeparators(secondLine);

  if (firstCommaCount === 0 && secondCommaCount > 0) {
    return true;
  }

  if (secondCommaCount > 0 && firstCommaCount !== secondCommaCount) {
    return true;
  }

  return false;
}

/**
 * CSV processor for converting CSV data to LLM-optimized formats
 *
 * Supports three output formats:
 * - raw: Original CSV format with proper escaping (RECOMMENDED for best LLM performance)
 * - json: JSON array format (best for structured data processing)
 * - markdown: Markdown table format (best for small datasets <100 rows)
 *
 * All formats use csv-parser for reliable parsing, then convert to the target format.
 *
 * @example
 * ```typescript
 * const csvBuffer = Buffer.from('name,age\nAlice,30\nBob,25');
 * const result = await CSVProcessor.process(csvBuffer, {
 *   maxRows: 1000,
 *   formatStyle: 'raw'
 * });
 * console.log(result.content); // CSV string with proper escaping
 * ```
 */
export class CSVProcessor {
  /**
   * Process CSV Buffer to LLM-friendly format
   * Content already loaded by FileDetector
   *
   * @param content - CSV file as Buffer
   * @param options - Processing options
   * @returns Formatted CSV data ready for LLM (JSON or Markdown)
   */
  static async process(
    content: Buffer,
    options?: CSVProcessorOptions,
  ): Promise<FileProcessingResult> {
    const {
      maxRows: rawMaxRows = 1000,
      formatStyle = "raw",
      includeHeaders = true,
      sampleDataFormat = "json",
    } = options || {};

    const maxRows = Math.max(1, Math.min(10000, rawMaxRows));

    const csvString = content.toString("utf-8");

    // For raw format, return original CSV with row limit (no parsing needed)
    // This preserves the exact original format which works best for LLMs
    if (formatStyle === "raw") {
      const lines = csvString.split("\n");
      const hasMetadataLine = isMetadataLine(lines);

      // Skip metadata line if present, then take header + maxRows data rows
      const csvLines = hasMetadataLine
        ? lines.slice(1) // Skip metadata line
        : lines;

      const limitedLines = csvLines.slice(0, 1 + maxRows); // header + data rows

      const limitedCSV = limitedLines.join("\n");

      const rowCount = limitedLines.length - 1; // Subtract header
      const originalRowCount = csvLines.length - 1; // Subtract header from original

      logger.debug(
        `[CSVProcessor] raw format: ${rowCount} rows (original: ${originalRowCount}) → ${limitedCSV.length} chars`,
        {
          formatStyle: "raw",
          originalSize: csvString.length,
          limitedSize: limitedCSV.length,
        },
      );

      return {
        type: "csv",
        content: limitedCSV,
        mimeType: "text/csv",
        metadata: {
          confidence: 100,
          size: content.length,
          rowCount,
          columnCount: (limitedLines[0] || "").split(",").length,
        },
      };
    }

    // Parse CSV for JSON and Markdown formats only
    const { rows, columnMapping } = await this.parseCSVStringWithMapping(
      csvString,
      maxRows,
    );

    // Extract metadata from parsed results
    const rowCount = rows.length;
    const columnNames =
      rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
    const columnCount = columnNames.length;
    const hasEmptyColumns = columnNames.some(
      (col) => !col || col.trim() === "",
    );
    const sampleRows = rows.slice(0, 3);
    const sampleData = this.formatSampleData(
      sampleRows,
      sampleDataFormat,
      includeHeaders,
    );

    // Build original column names and mapping for metadata
    const originalColumnNames = Array.from(columnMapping.keys());
    const columnMappingObj: Record<string, string> = {};
    columnMapping.forEach((sanitized, original) => {
      columnMappingObj[sanitized] = original;
    });

    // Format parsed data
    const formatted = this.formatForLLM(rows, formatStyle, includeHeaders);

    logger.info(
      `[CSVProcessor] ${formatStyle} format: ${rowCount} rows × ${columnCount} columns → ${formatted.length} chars`,
      { rowCount, columnCount, columns: columnNames, hasEmptyColumns },
    );

    return {
      type: "csv",
      content: formatted,
      mimeType: "text/csv",
      metadata: {
        confidence: 100,
        size: content.length,
        rowCount,
        columnCount,
        columnNames,
        originalColumnNames,
        columnMapping: columnMappingObj,
        sampleData,
        hasEmptyColumns,
      },
    };
  }

  /**
   * Parse CSV string into array of row objects using streaming
   * Memory-efficient for large files
   */
  /**
   * Parse CSV file from disk using streaming (memory efficient)
   *
   * @param filePath - Path to CSV file
   * @param maxRows - Maximum rows to parse (default: 1000)
   * @returns Array of row objects
   */
  static async parseCSVFile(
    filePath: string,
    maxRows: number = 1000,
  ): Promise<unknown[]> {
    const clampedMaxRows = Math.max(1, Math.min(10000, maxRows));
    const fs = await import("fs");

    // Read first 2 lines to detect metadata
    const fileHandle = await fs.promises.open(filePath, "r");
    const firstLines: string[] = [];
    const lineReader = fileHandle.createReadStream({ encoding: "utf-8" });

    await new Promise<void>((resolve) => {
      let buffer = "";
      lineReader.on("data", (chunk: string | Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        if (lines.length >= 2) {
          firstLines.push(lines[0], lines[1]);
          lineReader.destroy();
          resolve();
        }
      });
      lineReader.on("end", () => resolve());
    });

    await fileHandle.close();

    const hasMetadataLine = isMetadataLine(firstLines);
    const skipLines = hasMetadataLine ? 1 : 0;

    return new Promise((resolve, reject) => {
      const rows: unknown[] = [];
      let count = 0;
      let lineCount = 0;
      let columnMapping: Map<string, string> | null = null;

      const source = fs.createReadStream(filePath, { encoding: "utf-8" });
      const parser = csvParser();

      const abort = () => {
        source.destroy();
        parser.destroy();
      };

      source
        .pipe(parser)
        .on("data", (row: unknown) => {
          lineCount++;
          if (lineCount <= skipLines) {
            return;
          }

          // Build column mapping from first row
          if (!columnMapping) {
            columnMapping = new Map();
            const originalColumns = Object.keys(row as Record<string, unknown>);
            for (const col of originalColumns) {
              columnMapping.set(col, sanitizeColumnName(col));
            }
          }

          // Sanitize row keys
          const sanitizedRow = sanitizeRowKeys(
            row as Record<string, unknown>,
            columnMapping,
          );
          rows.push(sanitizedRow);
          count++;

          if (count >= clampedMaxRows) {
            logger.debug(
              `[CSVProcessor] Reached row limit ${clampedMaxRows}, stopping parse`,
            );
            abort();
            resolve(rows);
          }
        })
        .on("end", () => {
          resolve(rows);
        })
        .on("error", (error: Error) => {
          logger.error("[CSVProcessor] File parsing failed:", error);
          reject(error);
        });
    });
  }

  /**
   * Parse CSV string to array of row objects
   * Exposed for use by tools that need direct CSV parsing
   *
   * @param csvString - CSV data as string
   * @param maxRows - Maximum rows to parse (default: 1000)
   * @returns Array of row objects with sanitized column names
   */
  static async parseCSVString(
    csvString: string,
    maxRows: number = 1000,
  ): Promise<unknown[]> {
    const result = await this.parseCSVStringWithMapping(csvString, maxRows);
    return result.rows;
  }

  /**
   * Parse CSV string and return rows with column mapping
   * Internal method that returns both sanitized rows and original->sanitized column mapping
   *
   * @param csvString - CSV data as string
   * @param maxRows - Maximum rows to parse (default: 1000)
   * @returns Object with rows and column mapping
   */
  private static async parseCSVStringWithMapping(
    csvString: string,
    maxRows: number = 1000,
  ): Promise<{ rows: unknown[]; columnMapping: Map<string, string> }> {
    const clampedMaxRows = Math.max(1, Math.min(10000, maxRows));

    // Detect and skip metadata line
    const lines = csvString.split("\n");
    const hasMetadataLine = isMetadataLine(lines);
    const csvData = hasMetadataLine ? lines.slice(1).join("\n") : csvString;

    return new Promise((resolve, reject) => {
      const rows: unknown[] = [];
      let count = 0;
      let columnMapping: Map<string, string> | null = null;

      const source = Readable.from([csvData]);
      const parser = csvParser();

      const abort = () => {
        source.destroy();
        parser.destroy();
      };

      source
        .pipe(parser)
        .on("data", (row: unknown) => {
          // Build column mapping from first row
          if (!columnMapping) {
            columnMapping = new Map();
            const originalColumns = Object.keys(row as Record<string, unknown>);
            for (const col of originalColumns) {
              columnMapping.set(col, sanitizeColumnName(col));
            }
          }

          // Sanitize row keys
          const sanitizedRow = sanitizeRowKeys(
            row as Record<string, unknown>,
            columnMapping,
          );
          rows.push(sanitizedRow);
          count++;

          if (count >= clampedMaxRows) {
            logger.debug(
              `[CSVProcessor] Reached row limit ${clampedMaxRows}, stopping parse`,
            );
            abort();
            resolve({ rows, columnMapping: columnMapping || new Map() });
          }
        })
        .on("end", () => {
          resolve({ rows, columnMapping: columnMapping || new Map() });
        })
        .on("error", (error: Error) => {
          logger.error("[CSVProcessor] Parsing failed:", error);
          reject(error);
        });
    });
  }

  /**
   * Format parsed CSV data for LLM consumption
   * Only used for JSON and Markdown formats (raw format handled separately)
   */
  private static formatForLLM(
    rows: unknown[],
    formatStyle: "raw" | "markdown" | "json",
    includeHeaders: boolean,
  ): string {
    if (rows.length === 0) {
      return "CSV file is empty or contains no data.";
    }

    if (formatStyle === "json") {
      return JSON.stringify(rows, null, 2);
    }

    return this.toMarkdownTable(rows, includeHeaders);
  }

  /**
   * Format as markdown table
   * Best for small datasets (<100 rows)
   */
  private static toMarkdownTable(
    rows: unknown[],
    includeHeaders: boolean,
  ): string {
    if (rows.length === 0) {
      return "CSV file is empty or contains no data.";
    }

    const headers = Object.keys(rows[0] as Record<string, unknown>);

    // Escape backslashes, pipes, and sanitize newlines to keep rows intact
    const escapePipe = (str: string) =>
      str.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

    let markdown = "";

    if (includeHeaders) {
      markdown = "| " + headers.map(escapePipe).join(" | ") + " |\n";
      markdown += "|" + headers.map(() => " --- ").join("|") + "|\n";
    }

    rows.forEach((row) => {
      markdown +=
        "| " +
        headers
          .map((h) =>
            escapePipe(String((row as Record<string, unknown>)[h] || "")),
          )
          .join(" | ") +
        " |\n";
    });

    return markdown;
  }

  /**
   * Format sample data according to the specified format
   *
   * @param sampleRows - Array of sample row objects
   * @param format - Output format for sample data
   * @param includeHeaders - Whether to include headers in CSV/markdown formats
   * @returns Formatted sample data as string or array
   */
  private static formatSampleData(
    sampleRows: unknown[],
    format: SampleDataFormat,
    includeHeaders: boolean,
  ): string | unknown[] {
    if (sampleRows.length === 0) {
      return format === "object" ? [] : "No data rows";
    }

    switch (format) {
      case "object":
        return sampleRows;
      case "json":
        return JSON.stringify(sampleRows, null, 2);
      case "csv":
        return this.toCSVString(sampleRows, includeHeaders);
      case "markdown":
        return this.toMarkdownTable(sampleRows, includeHeaders);
      default:
        return sampleRows;
    }
  }

  /**
   * Convert row objects to CSV string format
   *
   * @param rows - Array of row objects
   * @param includeHeaders - Whether to include header row
   * @returns CSV formatted string
   */
  private static toCSVString(rows: unknown[], includeHeaders: boolean): string {
    if (rows.length === 0) {
      return "";
    }

    const headers = Object.keys(rows[0] as Record<string, unknown>);

    // Escape CSV values (wrap in quotes if contains comma, quote, or newline)
    const escapeCSV = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const lines: string[] = [];

    if (includeHeaders) {
      lines.push(headers.map(escapeCSV).join(","));
    }

    rows.forEach((row) => {
      const values = headers.map((h) =>
        escapeCSV(String((row as Record<string, unknown>)[h] ?? "")),
      );
      lines.push(values.join(","));
    });

    return lines.join("\n");
  }
}
