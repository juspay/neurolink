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
  CSVColumnDataType,
  CSVColumnMetadata,
  CSVDataQualityWarning,
} from "../types/index.js";

// ============================================================================
// Data Type Detection Patterns
// ============================================================================

const DATE_PATTERNS = [
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: "YYYY-MM-DD" },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: "MM/DD/YYYY" },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: "DD-MM-YYYY" },
  { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: "DD.MM.YYYY" },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: "YYYY/MM/DD" },
];

const DATETIME_PATTERNS = [
  { regex: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/, format: "ISO8601" },
  { regex: /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, format: "MM/DD/YYYY HH:mm" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/|www\.)[^\s]+$/i;
const INTEGER_REGEX = /^-?\d+$/;
const FLOAT_REGEX = /^-?\d+\.\d+$/;
const BOOLEAN_VALUES = new Set([
  "true",
  "false",
  "yes",
  "no",
  "1",
  "0",
  "t",
  "f",
  "y",
  "n",
]);

// ============================================================================
// Column Name Validation
// ============================================================================

/**
 * Validate column name and return issues
 */
function validateColumnName(name: string): string[] {
  const issues: string[] = [];

  if (!name || name.trim() === "") {
    issues.push("Empty or blank column name");
    return issues;
  }

  if (name !== name.trim()) {
    issues.push("Leading or trailing whitespace");
  }

  if (/^\d/.test(name)) {
    issues.push("Starts with a number");
  }

  if (/[^a-zA-Z0-9_\- ]/.test(name)) {
    issues.push("Contains special characters");
  }

  if (name.length > 64) {
    issues.push("Name exceeds 64 characters");
  }

  if (/\s{2,}/.test(name)) {
    issues.push("Contains multiple consecutive spaces");
  }

  return issues;
}

// ============================================================================
// Data Type Detection
// ============================================================================

/**
 * Detect the data type of a single value
 */
function detectValueType(value: string): CSVColumnDataType {
  if (value === "" || value === null || value === undefined) {
    return "empty";
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return "empty";
  }

  // Check boolean first (before numbers since "1" and "0" could be both)
  if (BOOLEAN_VALUES.has(trimmed.toLowerCase())) {
    return "boolean";
  }

  // Check integer
  if (INTEGER_REGEX.test(trimmed)) {
    return "integer";
  }

  // Check float
  if (FLOAT_REGEX.test(trimmed)) {
    return "float";
  }

  // Check email
  if (EMAIL_REGEX.test(trimmed)) {
    return "email";
  }

  // Check URL
  if (URL_REGEX.test(trimmed)) {
    return "url";
  }

  // Check datetime (before date since datetime is more specific)
  for (const pattern of DATETIME_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return "datetime";
    }
  }

  // Check date
  for (const pattern of DATE_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return "date";
    }
  }

  return "string";
}

/**
 * Detect date format from value
 */
function detectDateFormat(value: string): string | undefined {
  const trimmed = value.trim();

  for (const pattern of DATETIME_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return pattern.format;
    }
  }

  for (const pattern of DATE_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      return pattern.format;
    }
  }

  return undefined;
}

/**
 * Determine the predominant type for a column based on sampled values
 */
function determineColumnType(types: CSVColumnDataType[]): {
  type: CSVColumnDataType;
  confidence: number;
} {
  const nonEmpty = types.filter((t) => t !== "empty");

  if (nonEmpty.length === 0) {
    return { type: "empty", confidence: 100 };
  }

  // Count occurrences of each type
  const typeCounts = new Map<CSVColumnDataType, number>();
  for (const t of nonEmpty) {
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }

  // Find the most common type
  let maxType: CSVColumnDataType = "string";
  let maxCount = 0;
  for (const [type, count] of typeCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }

  // Calculate confidence
  const confidence = Math.round((maxCount / nonEmpty.length) * 100);

  // Consolidate integer and float into number if the column contains only numeric types
  // This check must happen before the mixed-type check to avoid classifying numeric-only columns as mixed
  if (typeCounts.has("integer") && typeCounts.has("float")) {
    // Check if these are the only two types (purely numeric column)
    if (typeCounts.size === 2) {
      const totalNumeric =
        (typeCounts.get("integer") || 0) + (typeCounts.get("float") || 0);
      const numericConfidence = Math.round(
        (totalNumeric / nonEmpty.length) * 100,
      );
      return { type: "number", confidence: numericConfidence };
    }
  }

  // If confidence is low and multiple types exist, mark as mixed
  if (confidence < 70 && typeCounts.size > 1) {
    return { type: "mixed", confidence };
  }

  return { type: maxType, confidence };
}

/**
 * Analyze a single column and return rich metadata
 */
function analyzeColumn(
  columnName: string,
  columnIndex: number,
  values: string[],
): CSVColumnMetadata {
  const types: CSVColumnDataType[] = [];
  const uniqueValues = new Set<string>();
  const numericValues: number[] = [];
  let nullCount = 0;
  let dateFormat: string | undefined;

  for (const value of values) {
    const trimmed = value?.trim() ?? "";

    if (trimmed === "") {
      nullCount++;
      types.push("empty");
      continue;
    }

    uniqueValues.add(trimmed);
    const type = detectValueType(trimmed);
    types.push(type);

    // Collect numeric values for statistics
    if (type === "integer" || type === "float") {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        numericValues.push(num);
      }
    }

    // Detect date format
    if ((type === "date" || type === "datetime") && !dateFormat) {
      dateFormat = detectDateFormat(trimmed);
    }
  }

  const { type: detectedType, confidence } = determineColumnType(types);

  // Get sample values (up to 5 unique non-empty)
  const sampleValues = Array.from(uniqueValues).slice(0, 5);

  // Calculate numeric statistics
  let minValue: number | undefined;
  let maxValue: number | undefined;
  let avgValue: number | undefined;

  if (numericValues.length > 0) {
    minValue = Math.min(...numericValues);
    maxValue = Math.max(...numericValues);
    avgValue =
      Math.round(
        (numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 100,
      ) / 100;
  }

  // Validate column name
  const nameIssues = validateColumnName(columnName);

  const metadata: CSVColumnMetadata = {
    name: columnName,
    index: columnIndex,
    detectedType,
    typeConfidence: confidence,
    nullCount,
    uniqueCount: uniqueValues.size,
    sampleValues,
  };

  if (minValue !== undefined) {
    metadata.minValue = minValue;
  }
  if (maxValue !== undefined) {
    metadata.maxValue = maxValue;
  }
  if (avgValue !== undefined) {
    metadata.avgValue = avgValue;
  }
  if (dateFormat) {
    metadata.dateFormat = dateFormat;
  }
  if (nameIssues.length > 0) {
    metadata.nameIssues = nameIssues;
  }

  return metadata;
}

/**
 * Generate data quality warnings based on column analysis
 */
function generateDataQualityWarnings(
  columns: CSVColumnMetadata[],
  totalRows: number,
): CSVDataQualityWarning[] {
  const warnings: CSVDataQualityWarning[] = [];

  for (const col of columns) {
    // Check for high null rate (>20%)
    const nullRate = totalRows > 0 ? col.nullCount / totalRows : 0;
    if (nullRate > 0.2) {
      warnings.push({
        column: col.name,
        type: "high_null_rate",
        message: `Column has ${Math.round(nullRate * 100)}% empty/null values (${col.nullCount} of ${totalRows} rows)`,
        severity: nullRate > 0.5 ? "warning" : "info",
        affectedRows: col.nullCount,
      });
    }

    // Check for invalid column names
    if (col.nameIssues && col.nameIssues.length > 0) {
      warnings.push({
        column: col.name,
        type: "invalid_name",
        message: `Column name issues: ${col.nameIssues.join(", ")}`,
        severity: col.name.trim() === "" ? "error" : "warning",
      });
    }

    // Check for mixed types (low confidence)
    if (col.detectedType === "mixed" || col.typeConfidence < 70) {
      warnings.push({
        column: col.name,
        type: "mixed_types",
        message: `Column has inconsistent data types (${col.typeConfidence}% confidence for ${col.detectedType})`,
        severity: "warning",
      });
    }

    // Check for potential duplicates (very low unique count)
    if (totalRows > 10 && col.uniqueCount === 1 && col.nullCount === 0) {
      warnings.push({
        column: col.name,
        type: "duplicates",
        message: `All ${totalRows} rows have the same value`,
        severity: "info",
        affectedRows: totalRows,
      });
    }

    // Check for all empty column
    if (col.detectedType === "empty") {
      warnings.push({
        column: col.name,
        type: "empty_values",
        message: "Column is entirely empty",
        severity: "warning",
        affectedRows: totalRows,
      });
    }
  }

  return warnings;
}

/**
 * Calculate overall data quality score
 */
function calculateDataQualityScore(
  columns: CSVColumnMetadata[],
  warnings: CSVDataQualityWarning[],
  totalRows: number,
): number {
  if (columns.length === 0 || totalRows === 0) {
    return 0;
  }

  let score = 100;

  // Deduct for warnings
  for (const warning of warnings) {
    switch (warning.severity) {
      case "error":
        score -= 15;
        break;
      case "warning":
        score -= 8;
        break;
      case "info":
        score -= 3;
        break;
    }
  }

  // Deduct for overall null rate
  const totalNulls = columns.reduce((sum, col) => sum + col.nullCount, 0);
  const totalCells = columns.length * totalRows;
  const overallNullRate = totalCells > 0 ? totalNulls / totalCells : 0;
  score -= Math.round(overallNullRate * 30);

  // Deduct for low type confidence
  const avgConfidence =
    columns.reduce((sum, col) => sum + col.typeConfidence, 0) / columns.length;
  if (avgConfidence < 80) {
    score -= Math.round((80 - avgConfidence) / 2);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze all columns in parsed CSV data
 */
function analyzeColumns(rows: unknown[]): {
  columnMetadata: CSVColumnMetadata[];
  dataQualityWarnings: CSVDataQualityWarning[];
  dataQualityScore: number;
} {
  if (rows.length === 0) {
    return {
      columnMetadata: [],
      dataQualityWarnings: [],
      dataQualityScore: 0,
    };
  }

  const columnNames = Object.keys(rows[0] as Record<string, unknown>);
  const columnMetadata: CSVColumnMetadata[] = [];

  for (let i = 0; i < columnNames.length; i++) {
    const colName = columnNames[i];
    const values = rows.map((row) =>
      String((row as Record<string, unknown>)[colName] ?? ""),
    );
    columnMetadata.push(analyzeColumn(colName, i, values));
  }

  const dataQualityWarnings = generateDataQualityWarnings(
    columnMetadata,
    rows.length,
  );
  const dataQualityScore = calculateDataQualityScore(
    columnMetadata,
    dataQualityWarnings,
    rows.length,
  );

  return {
    columnMetadata,
    dataQualityWarnings,
    dataQualityScore,
  };
}

/**
 * Detect if the first row appears to be a header row
 *
 * Heuristics used:
 * 1. Header values should be text/string type (not numbers, dates, emails, etc.)
 * 2. Header values should be unique (no duplicate column names)
 * 3. If data rows exist, headers should have different type profile than data
 *
 * @param headerValues - The values from the first row (potential headers)
 * @param dataRows - Sample of data rows for comparison (optional)
 * @returns true if the first row appears to be headers
 */
function detectHasHeaders(
  headerValues: string[],
  dataRows?: Record<string, unknown>[],
): boolean {
  if (headerValues.length === 0) {
    return false;
  }

  // Check 1: All header values should look like text labels, not data values
  let textLikeCount = 0;
  for (const value of headerValues) {
    const trimmed = value?.trim() ?? "";
    if (trimmed === "") {
      continue; // Empty headers are allowed but don't count toward text-like
    }

    const type = detectValueType(trimmed);
    // Headers are typically strings - not numbers, dates, emails, URLs, or booleans
    if (type === "string") {
      textLikeCount++;
    }
  }

  // If most header values are text-like (not numeric/date/etc.), likely headers
  const nonEmptyHeaders = headerValues.filter((v) => v?.trim()).length;
  if (nonEmptyHeaders === 0) {
    return false;
  }

  const textRatio = textLikeCount / nonEmptyHeaders;

  // Check 2: Headers should be unique
  const uniqueHeaders = new Set(
    headerValues.map((v) => v?.trim().toLowerCase()),
  );
  const hasUniqueHeaders = uniqueHeaders.size === headerValues.length;

  // Check 3: Compare with data rows if available
  if (dataRows && dataRows.length > 0) {
    // If first data row has different type profile than headers, likely has headers
    const firstDataRow = Object.values(dataRows[0] || {}).map((v) =>
      String(v ?? ""),
    );
    let dataTextCount = 0;
    for (const value of firstDataRow) {
      const type = detectValueType(value?.trim() ?? "");
      if (type === "string") {
        dataTextCount++;
      }
    }
    const dataTextRatio =
      firstDataRow.length > 0 ? dataTextCount / firstDataRow.length : 0;

    // If headers are mostly text but data has more varied types, likely has headers
    if (textRatio > 0.7 && dataTextRatio < textRatio - 0.2) {
      return true;
    }
  }

  // Default: if >70% of header values are text-like and unique, assume headers
  return textRatio >= 0.7 && hasUniqueHeaders;
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

  const firstCommaCount = (firstLine.match(/,/g) || []).length;
  const secondCommaCount = (secondLine.match(/,/g) || []).length;

  if (firstCommaCount === 0 && secondCommaCount > 0) {
    return true;
  }

  if (secondCommaCount > 0 && firstCommaCount !== secondCommaCount) {
    return true;
  }

  return false;
}

/**
 * Split CSV text into logical lines for metadata detection and raw row limiting.
 *
 * Supports Unix (LF), Windows (CRLF), and classic Mac (CR) line endings.
 */
function splitCsvLines(csvString: string): string[] {
  return csvString.split(/\r\n|\n|\r/);
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
      extension = null,
    } = options || {};

    const maxRows = Math.max(1, Math.min(10000, rawMaxRows));

    logger.debug("[CSVProcessor] Starting CSV processing", {
      contentSize: content.length,
      formatStyle,
      maxRows,
      includeHeaders,
    });

    const csvString = content.toString("utf-8");

    // For raw format, return CSV text with row limit (no parsing needed)
    // This preserves the CSV shape while normalizing line endings for row handling.
    if (formatStyle === "raw") {
      const lines = splitCsvLines(csvString);
      const hasMetadataLine = isMetadataLine(lines);

      if (hasMetadataLine) {
        logger.debug(
          "[CSVProcessor] Detected metadata line, skipping first line",
        );
      }

      // Skip metadata line if present, then take header + maxRows data rows
      const csvLines = hasMetadataLine
        ? lines.slice(1) // Skip metadata line
        : lines;

      const limitedLines = csvLines.slice(0, 1 + maxRows); // header + data rows

      const limitedCSV = limitedLines.join("\n");

      const rowCount = limitedLines
        .slice(1)
        .filter((line) => line.trim() !== "").length;
      const originalRowCount = csvLines
        .slice(1)
        .filter((line) => line.trim() !== "").length;
      const wasTruncated = rowCount < originalRowCount;

      if (wasTruncated) {
        logger.warn(
          `[CSVProcessor] CSV data truncated: showing ${rowCount} of ${originalRowCount} rows (limit: ${maxRows})`,
        );
      }

      logger.debug(
        `[CSVProcessor] raw format: ${rowCount} rows (original: ${originalRowCount}) → ${limitedCSV.length} chars`,
        {
          formatStyle: "raw",
          originalSize: csvString.length,
          limitedSize: limitedCSV.length,
        },
      );

      logger.info("[CSVProcessor] ✅ Processed CSV file", {
        formatStyle: "raw",
        rowCount,
        columnCount: (limitedLines[0] || "").split(",").length,
        truncated: wasTruncated,
      });

      // Parse a sample for enhanced metadata analysis (raw format still benefits from column analysis)
      const sampleForAnalysis = await this.parseCSVString(
        limitedCSV,
        Math.min(rowCount, 500),
      );
      const { columnMetadata, dataQualityWarnings, dataQualityScore } =
        analyzeColumns(sampleForAnalysis);

      // Log data quality summary
      if (dataQualityWarnings.length > 0) {
        logger.debug("[CSVProcessor] Data quality warnings detected", {
          warningCount: dataQualityWarnings.length,
          score: dataQualityScore,
        });
      }

      return {
        type: "csv",
        content: limitedCSV,
        mimeType: "text/csv",
        metadata: {
          confidence: 100,
          size: content.length,
          rowCount,
          totalLines: limitedLines.length,
          columnCount: (limitedLines[0] || "").split(",").length,
          extension,
          columnMetadata,
          dataQualityWarnings,
          dataQualityScore,
          hasHeaders: detectHasHeaders(
            (limitedLines[0] || "").split(","),
            undefined,
          ),
          detectedDelimiter: ",",
        },
      };
    }

    // Parse CSV for JSON and Markdown formats only
    logger.debug(
      "[CSVProcessor] Parsing CSV for structured format conversion",
      {
        formatStyle,
        maxRows,
      },
    );

    const rows = await this.parseCSVString(csvString, maxRows);

    // Filter out empty rows (empty objects or rows with only whitespace values from blank lines)
    const nonEmptyRows = rows.filter((row) => {
      if (!row || typeof row !== "object") {
        return false;
      }
      const keys = Object.keys(row);
      if (keys.length === 0) {
        return false;
      }
      // Check if all values are empty or whitespace-only
      return !Object.values(row).every(
        (val) => val === "" || (typeof val === "string" && val.trim() === ""),
      );
    });

    // Extract metadata from parsed results
    const rowCount = nonEmptyRows.length;
    const columnNames =
      nonEmptyRows.length > 0
        ? Object.keys(nonEmptyRows[0] as Record<string, unknown>)
        : [];
    const columnCount = columnNames.length;
    const hasEmptyColumns = columnNames.some(
      (col) => !col || col.trim() === "",
    );
    const sampleRows = nonEmptyRows.slice(0, 3);
    const sampleData = this.formatSampleData(
      sampleRows,
      sampleDataFormat,
      includeHeaders,
    );

    if (hasEmptyColumns) {
      logger.warn("[CSVProcessor] CSV contains empty or blank column headers", {
        columnNames,
      });
    }

    if (rowCount === 0) {
      logger.warn("[CSVProcessor] CSV file contains no data rows");
    }

    // Perform enhanced column analysis
    const { columnMetadata, dataQualityWarnings, dataQualityScore } =
      analyzeColumns(nonEmptyRows);

    // Log data quality summary
    if (dataQualityWarnings.length > 0) {
      logger.debug("[CSVProcessor] Data quality warnings detected", {
        warningCount: dataQualityWarnings.length,
        score: dataQualityScore,
      });
    }

    // Format parsed data
    logger.debug(
      `[CSVProcessor] Converting ${rowCount} rows to ${formatStyle} format`,
    );
    const formatted = this.formatForLLM(
      nonEmptyRows,
      formatStyle,
      includeHeaders,
    );

    logger.info("[CSVProcessor] ✅ Processed CSV file", {
      formatStyle,
      rowCount,
      columnCount,
      outputLength: formatted.length,
      hasEmptyColumns,
      dataQualityScore,
    });

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
        sampleData,
        hasEmptyColumns,
        extension,
        columnMetadata,
        dataQualityWarnings,
        dataQualityScore,
        hasHeaders: detectHasHeaders(
          columnNames,
          nonEmptyRows as Record<string, unknown>[],
        ),
        detectedDelimiter: ",",
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

    logger.debug("[CSVProcessor] Starting file parsing", {
      filePath,
      maxRows: clampedMaxRows,
    });

    // Read first 2 lines to detect metadata
    const fileHandle = await fs.promises.open(filePath, "r");
    const firstLines: string[] = [];
    const lineReader = fileHandle.createReadStream({ encoding: "utf-8" });

    await new Promise<void>((resolve) => {
      let buffer = "";
      lineReader.on("data", (chunk: string | Buffer) => {
        buffer += chunk.toString();
        const splitBuffer = buffer.endsWith("\r")
          ? buffer.slice(0, -1)
          : buffer;
        const lines = splitCsvLines(splitBuffer);
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

    if (hasMetadataLine) {
      logger.debug(
        "[CSVProcessor] Detected metadata line in file, will skip first line",
      );
    }

    return new Promise((resolve, reject) => {
      const rows: unknown[] = [];
      let count = 0;
      let lineCount = 0;

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

          rows.push(row);
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
          logger.debug(
            `[CSVProcessor] File parsing complete: ${rows.length} rows parsed`,
          );
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
   * @returns Array of row objects
   */
  static async parseCSVString(
    csvString: string,
    maxRows: number = 1000,
  ): Promise<unknown[]> {
    const clampedMaxRows = Math.max(1, Math.min(10000, maxRows));

    logger.debug("[CSVProcessor] Starting string parsing", {
      inputLength: csvString.length,
      maxRows: clampedMaxRows,
    });

    // Detect and skip metadata line
    const lines = splitCsvLines(csvString);
    const hasMetadataLine = isMetadataLine(lines);
    const csvData = hasMetadataLine
      ? lines.slice(1).join("\n")
      : lines.join("\n");

    if (hasMetadataLine) {
      logger.debug("[CSVProcessor] Detected metadata line in string, skipping");
    }

    return new Promise((resolve, reject) => {
      const rows: unknown[] = [];
      let count = 0;

      const source = Readable.from([csvData]);
      const parser = csvParser();

      const abort = () => {
        source.destroy();
        parser.destroy();
      };

      source
        .pipe(parser)
        .on("data", (row: unknown) => {
          rows.push(row);
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
          logger.debug(
            `[CSVProcessor] String parsing complete: ${rows.length} rows parsed`,
          );
          resolve(rows);
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
      str
        .replace(/\\/g, "\\\\")
        .replace(/\|/g, "\\|")
        .replace(/\r\n|\n|\r/g, " ");

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
      if (
        value.includes(",") ||
        value.includes('"') ||
        /\r\n|\n|\r/.test(value)
      ) {
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
