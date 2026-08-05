/**
 * CSV Processing Utility
 * Converts CSV files to LLM-friendly text formats
 * Uses streaming for memory efficiency with large files
 */

import csvParser from "csv-parser";
import iconv from "iconv-lite";
import { Readable, Transform } from "stream";
import { extname } from "path";
import { logger } from "./logger.js";
import {
  splitCSVFields,
  detectDelimiter as detectDelimiterUtil,
  CANDIDATE_DELIMITERS,
} from "./csvUtils.js";
import { isObject } from "./typeUtils.js";
import { decodeBuffer } from "./textEncoding.js";
import { ErrorFactory } from "./errorHandling.js";
import { withTimeout, TimeoutError } from "./async/withTimeout.js";
import type {
  FileProcessingResult,
  CSVProcessorOptions,
  CSVRow,
  SampleDataFormat,
  CSVColumnDataType,
  CSVColumnMetadata,
  CSVDataQualityWarning,
} from "../types/index.js";

// ============================================================================
// Parse Safety Limits (#371 / #379)
// ============================================================================

/**
 * Upper bound on a single CSV row's byte size (#371). csv-parser defaults to an
 * effectively-unbounded `maxRowBytes`; a pathological unbroken row would grow
 * memory without limit and never fire the parser's own error path. 10 MB/row is
 * generous for legitimate data (e.g. a large JSON blob in one cell) while
 * bounding a single allocation and making the parser-error cleanup path
 * reachable/testable.
 */
const CSV_MAX_ROW_BYTES = 10 * 1024 * 1024;

/** Default wall-clock cap for `parseCSVString` (#379). */
const DEFAULT_CSV_STRING_PARSE_TIMEOUT_MS = 30_000;

/** Default wall-clock cap for `parseCSVFile` (#379). */
const DEFAULT_CSV_FILE_PARSE_TIMEOUT_MS = 300_000;

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
// Column Name Sanitization (#378)
// ============================================================================

/**
 * Rewrite a raw header into a valid identifier. Trims, replaces non-identifier
 * runs with `_`, prefixes a `col_` when it starts with a digit or is empty,
 * then applies the requested case style. Never returns an empty string.
 */
export function sanitizeColumnName(
  name: string,
  style: "camelCase" | "snake_case" = "snake_case",
  index = 0,
): string {
  const trimmed = (name ?? "").trim();
  // Split on runs of non-alphanumeric characters. Using split (linear) instead
  // of a `^_+|_+$` trim regex avoids the polynomial-backtracking ReDoS CodeQL
  // flags on long underscore/separator runs, and drops leading/trailing/empty
  // segments naturally.
  let parts = trimmed.split(/[^A-Za-z0-9]+/).filter((p) => p.length > 0);
  let base = parts.join("_");
  if (base === "") {
    base = `col_${index + 1}`;
    parts = [base];
  } else if (/^[0-9]/.test(base)) {
    base = `col_${base}`;
    parts = base.split("_").filter((p) => p.length > 0);
  }
  if (style === "camelCase") {
    return parts
      .map((p, i) =>
        i === 0
          ? p.charAt(0).toLowerCase() + p.slice(1)
          : p.charAt(0).toUpperCase() + p.slice(1),
      )
      .join("");
  }
  return parts.map((p) => p.toLowerCase()).join("_");
}

/**
 * Deduplicate a list of (already sanitized) names by suffixing `_2`, `_3`, … on
 * collisions, preserving order. The suffixed candidate is bumped until it does
 * not collide with ANY already-emitted name — so an existing `name_2` can't be
 * silently overwritten by a generated `name_2` (which the naive counter did for
 * `["name","name","name_2"]`).
 */
export function dedupeColumnNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
    let n = 2;
    let candidate = `${name}_${n}`;
    while (used.has(candidate)) {
      n++;
      candidate = `${name}_${n}`;
    }
    used.add(candidate);
    return candidate;
  });
}

/**
 * Compute sanitized (and deduped) column names plus the original→sanitized
 * mapping for the names that actually changed.
 */
function buildColumnNameMapping(
  headers: string[],
  style: "camelCase" | "snake_case",
): {
  sanitized: string[];
  mapping: Array<{ original: string; sanitized: string }>;
} {
  const sanitized = dedupeColumnNames(
    headers.map((h, i) => sanitizeColumnName(h, style, i)),
  );
  const mapping = headers
    .map((original, i) => ({ original, sanitized: sanitized[i] }))
    .filter((m) => m.original !== m.sanitized);
  return { sanitized, mapping };
}

// ============================================================================
// Row Validation (#384)
// ============================================================================

/**
 * Predicate form of the row-shape invariant: a non-null, non-array object whose
 * every value is a string or undefined. csv-parser's default output always
 * satisfies this; the guard is defense-in-depth at the parse boundary.
 */
export function isValidCsvRow(row: unknown): row is CSVRow {
  if (!isObject(row) || Array.isArray(row)) {
    return false;
  }
  return Object.values(row).every(
    (v) => typeof v === "string" || v === undefined,
  );
}

/**
 * Assertion form used inside the streaming `data` handlers. Throws a
 * `[CSVProcessor]`-prefixed error (so existing `includes("CSV")` catches still
 * match) when a row violates the invariant.
 */
export function assertValidCsvRow(
  row: unknown,
  rowNumber: number,
): asserts row is CSVRow {
  if (!isValidCsvRow(row)) {
    throw ErrorFactory.csvRowInvalid(
      `[CSVProcessor] Invalid CSV row ${rowNumber}: expected a string-keyed object with string values, got ${
        Array.isArray(row) ? "array" : typeof row
      }`,
      rowNumber,
    );
  }
}

/**
 * True when a parsed CSV row is blank: no keys, or every value is empty /
 * whitespace-only (#373). Shared by the structured post-filter and by
 * `streamParse` so blank rows do not consume `maxRows`.
 */
export function isBlankCsvDataRow(row: CSVRow): boolean {
  const keys = Object.keys(row);
  if (keys.length === 0) {
    return true;
  }
  return Object.values(row).every(
    (val) => val === "" || (typeof val === "string" && val.trim() === ""),
  );
}

// ============================================================================
// Parse Error Context (#375)
// ============================================================================

/**
 * Build an enriched, consistent parse-failure message shared by all four
 * source/parser reject sites so they can't re-diverge.
 *
 * Deliberately structural-only: `headerCount` and `lastRowColumnCount` report
 * how many columns the header/last row had — counts, never the actual header
 * or cell string values. Parsed header text is user-controlled CSV data (and,
 * for headerless input, may literally be first-row cell values), so it must
 * never be embedded in a thrown/logged message (#1199).
 */
function buildCsvParseErrorMessage(info: {
  stage: "read" | "parse";
  count: number;
  headerCount?: number;
  bytesRead?: number;
  lastRowColumnCount?: number;
  location?: string;
  cause: string;
}): string {
  const parts = [
    `[CSVProcessor] CSV ${info.stage === "read" ? "file read" : "parsing"} failed after ${info.count} row(s)`,
  ];
  if (info.location) {
    parts.push(`(${info.location})`);
  }
  parts.push(`: ${info.cause}`);
  parts.push(
    typeof info.headerCount === "number"
      ? `| headerCount: ${info.headerCount}`
      : "| headerCount: unknown (failed before headers were parsed)",
  );
  if (typeof info.bytesRead === "number") {
    parts.push(`| bytesRead: ${info.bytesRead}`);
  }
  if (typeof info.lastRowColumnCount === "number") {
    parts.push(`| lastRow columns: ${info.lastRowColumnCount}`);
  }
  parts.push("| Expected RFC 4180 CSV (comma-separated, double-quote escaped)");
  return parts.join(" ");
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
/**
 * Confidence for a CSV processing result, weighted by data quality.
 *
 * The result used to report a static `confidence: 100` regardless of how clean
 * the data was. This ties confidence to `dataQualityScore` so it actually
 * varies with quality factors (ragged rows, high null rate, type
 * inconsistency): a cleanly-parsed CSV stays at 100, a messy one is pulled
 * halfway toward its quality score. It never drops below 50 for a CSV that
 * parsed — the *format* is certain, only the *data* is imperfect.
 */
function csvResultConfidence(dataQualityScore: number): number {
  const clamped = Math.max(0, Math.min(100, dataQualityScore));
  return Math.round((100 + clamped) / 2);
}

function analyzeColumns(rows: CSVRow[]): {
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

  const columnNames = Object.keys(rows[0]);
  const columnMetadata: CSVColumnMetadata[] = [];

  for (let i = 0; i < columnNames.length; i++) {
    const colName = columnNames[i];
    const values = rows.map((row) => String(row[colName] ?? ""));
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
/**
 * Strip a leading UTF-8 BOM (U+FEFF) if present. Exported so every entry
 * point that sniffs raw text (including the RAG CSVLoader) normalizes BOMs
 * the same way before metadata/delimiter detection.
 */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Count commas that fall OUTSIDE double-quoted fields (RFC 4180, escaped-quote
 * aware). A quoted comma is field content, not a column separator, so counting
 * naively would misclassify a quoted-comma header line.
 */
function countUnquotedCommas(line: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      count++;
    }
  }
  return count;
}

function isMetadataLine(lines: string[]): boolean {
  if (!lines[0] || lines.length < 2) {
    return false;
  }

  const firstLine = lines[0].trim();
  const secondLine = lines[1].trim();

  if (firstLine.match(/^sep=/i)) {
    return true;
  }

  const firstCommaCount = countUnquotedCommas(firstLine);
  const secondCommaCount = countUnquotedCommas(secondLine);

  if (firstCommaCount === 0 && secondCommaCount > 0) {
    return true;
  }

  if (secondCommaCount > 0 && firstCommaCount !== secondCommaCount) {
    return true;
  }

  return false;
}

/**
 * Strip a leading metadata line (e.g. Excel's `sep=;` preamble) from
 * already-split lines, and read the delimiter it explicitly declares.
 * Excel semantics: an explicit `sep=<char>` always wins over frequency-based
 * detection; a metadata line without a recognized delimiter character is
 * simply dropped from the sample without forcing a delimiter. This is the
 * single place process(), detectDelimiter(), parseCSVFile(), and
 * parseCSVString() all go through, so none of them detect a delimiter over
 * the raw, un-stripped lines (which lets the preamble skew detection).
 * Exported so non-CSVProcessor callers (the RAG CSVLoader) share it too.
 */
export function stripMetadataLine(lines: string[]): {
  dataLines: string[];
  hasMetadataLine: boolean;
  explicitDelimiter?: string;
} {
  if (!isMetadataLine(lines)) {
    return { dataLines: lines, hasMetadataLine: false };
  }
  const sepChar = lines[0]?.trim().match(/^sep=(.)/i)?.[1];
  const explicitDelimiter =
    sepChar && (CANDIDATE_DELIMITERS as readonly string[]).includes(sepChar)
      ? sepChar
      : undefined;
  return {
    dataLines: lines.slice(1),
    hasMetadataLine: true,
    explicitDelimiter,
  };
}

/**
 * Split CSV text into logical rows for metadata detection and raw row limiting.
 *
 * Supports Unix (LF), Windows (CRLF), and classic Mac (CR) line endings, and is
 * quote-aware: a line ending that appears *inside* a quoted field (RFC 4180) is
 * kept as part of that field rather than treated as a row boundary. A doubled
 * `""` inside quotes is the RFC-4180 escaped quote and does not toggle the quote
 * state. For unquoted input this yields exactly the same result as a plain
 * `split(/\r\n|\n|\r/)`.
 *
 * Exported so non-CSVProcessor callers (the RAG CSVLoader) get the same
 * quote-aware row boundaries instead of a physical `content.split("\n")`,
 * which would break rows on a newline embedded in a quoted field.
 */
export function splitCsvLines(csvString: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < csvString.length; i++) {
    const ch = csvString[i];
    if (ch === '"') {
      if (inQuotes && csvString[i + 1] === '"') {
        // Escaped quote ("") — stays inside the field, quote state unchanged.
        current += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      // Row boundary outside quotes; collapse CRLF into a single boundary.
      if (ch === "\r" && csvString[i + 1] === "\n") {
        i++;
      }
      rows.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  rows.push(current);
  return rows;
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
      encoding,
      sanitizeColumnNames = false,
      columnNameCase = "snake_case",
      parseTimeoutMs = DEFAULT_CSV_STRING_PARSE_TIMEOUT_MS,
      skipEmptyLines = true,
    } = options || {};

    const maxRows = Math.max(1, Math.min(10000, rawMaxRows));

    logger.debug("[CSVProcessor] Starting CSV processing", {
      contentSize: content.length,
      formatStyle,
      maxRows,
      includeHeaders,
      skipEmptyLines,
    });

    // #362: detect the encoding (BOM → chardet → UTF-8 fallback) or honor the
    // caller's override, instead of the previous hard-coded UTF-8 decode.
    const {
      text: csvString,
      encoding: detectedEncoding,
      confidence: encodingConfidence,
    } = decodeBuffer(content, encoding);

    // #361: split once and strip a leading Excel `sep=` metadata line before
    // detecting the delimiter (comma/tab/semicolon/pipe), so the preamble
    // can't skew detection — then reuse dataLines below instead of
    // re-splitting csvString for the raw-format row handling.
    const lines = splitCsvLines(csvString);
    const { dataLines, hasMetadataLine, explicitDelimiter } =
      stripMetadataLine(lines);
    const delimiter =
      explicitDelimiter ??
      detectDelimiterUtil(dataLines, extension ?? undefined);

    // For raw format, return CSV text with row limit (no parsing needed)
    // This preserves the CSV shape while normalizing line endings for row handling.
    if (formatStyle === "raw") {
      if (hasMetadataLine) {
        logger.debug(
          "[CSVProcessor] Detected metadata line, skipping first line",
        );
      }

      // dataLines already has the metadata line (if any) stripped.
      const csvLines = dataLines;
      const headerLine = csvLines[0] ?? "";
      const rawDataLines = csvLines.slice(1);

      // #373: optionally drop blank/whitespace-only data lines so raw
      // `content` matches rowCount (previously only the count filtered them).
      const effectiveDataLines = skipEmptyLines
        ? rawDataLines.filter((line) => line.trim() !== "")
        : rawDataLines;

      const limitedDataLines = effectiveDataLines.slice(0, maxRows);
      const limitedLines =
        csvLines.length === 0 ? [] : [headerLine, ...limitedDataLines];

      // #378: opt-in — rewrite the literal header line with sanitized,
      // deduped identifiers so the raw CSV text shown to the LLM has clean
      // column names too. (Splits on commas to match the existing raw-branch
      // columnCount logic.)
      let rawColumnNameMapping:
        | Array<{ original: string; sanitized: string }>
        | undefined;
      if (sanitizeColumnNames && limitedLines.length > 0) {
        const headerCols = splitCSVFields(limitedLines[0] || "", delimiter);
        const { sanitized, mapping } = buildColumnNameMapping(
          headerCols,
          columnNameCase,
        );
        limitedLines[0] = sanitized.join(delimiter);
        rawColumnNameMapping = mapping.length > 0 ? mapping : undefined;
      }

      const limitedCSV = limitedLines.join("\n");

      // #1199: quote-aware, delimiter-aware split (matches the
      // sanitizeColumnNames branch above and #1192's detected delimiter).
      const headerFields = splitCSVFields(limitedLines[0] || "", delimiter);

      // When preserving empties, blank lines count as rows; when skipping,
      // only non-empty data lines do.
      const rowCount = limitedDataLines.length;
      const originalRowCount = effectiveDataLines.length;
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
        columnCount: headerFields.length,
        truncated: wasTruncated,
      });

      // Parse a sample for enhanced metadata analysis (raw format still
      // benefits from column analysis). Reuse the already-split, already
      // metadata-stripped `dataLines` and the already-detected `delimiter`
      // via the shared streamParse() core instead of routing `limitedCSV`
      // back through parseCSVStringWithMeta(), which would re-split/re-join
      // it and re-run a redundant BOM/metadata/delimiter-detection pass.
      const sampleRows = Math.min(rowCount, 500);
      const { rows: sampleForAnalysis, timedOut: rawTimedOut } =
        await this.streamParse(
          Readable.from([dataLines.slice(0, 1 + sampleRows).join("\n")]),
          undefined,
          {
            maxRows: sampleRows,
            skipLines: 0,
            timeoutMs: parseTimeoutMs,
            delimiter,
          },
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
          confidence: csvResultConfidence(dataQualityScore),
          size: content.length,
          rowCount,
          totalLines: limitedLines.length,
          columnCount: headerFields.length,
          extension,
          columnMetadata,
          dataQualityWarnings,
          dataQualityScore,
          hasHeaders: detectHasHeaders(headerFields, undefined),
          detectedDelimiter: delimiter,
          detectedEncoding,
          encodingConfidence,
          ...(rawColumnNameMapping
            ? { columnNameMapping: rawColumnNameMapping }
            : {}),
          ...(rawTimedOut ? { parseTimedOut: true } : {}),
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

    // dataLines was already split and metadata-stripped above (alongside
    // `delimiter`) — reuse both via the shared streamParse() core instead of
    // routing csvString back through parseCSVStringWithMeta(), which would
    // re-split it and re-run metadata/delimiter detection a second time.
    const { rows, timedOut: structuredTimedOut } = await this.streamParse(
      Readable.from([dataLines.join("\n")]),
      undefined,
      {
        maxRows,
        skipLines: 0,
        timeoutMs: parseTimeoutMs,
        delimiter,
        // Count only non-blank rows toward maxRows when skipping empties
        // (#373), so maxRows: 2 still yields two real data rows if blanks
        // appear first.
        skipEmptyRows: skipEmptyLines,
      },
    );

    // Filter out empty rows (empty objects or rows with only whitespace values
    // from blank lines). #373: `skipEmptyLines` (default true) controls this;
    // set false to preserve blank-line rows in structured output.
    const filteredRows = rows.filter((row) => {
      if (!row || typeof row !== "object") {
        return false;
      }
      if (!skipEmptyLines) {
        return true;
      }
      return !isBlankCsvDataRow(row);
    });

    // #378: opt-in — remap each row's keys from original → sanitized identifiers.
    let structuredColumnNameMapping:
      | Array<{ original: string; sanitized: string }>
      | undefined;
    const sanitizedToOriginal = new Map<string, string>();
    let nonEmptyRows: CSVRow[] = filteredRows;
    if (sanitizeColumnNames && filteredRows.length > 0) {
      const origHeaders = Object.keys(filteredRows[0]);
      const { sanitized, mapping } = buildColumnNameMapping(
        origHeaders,
        columnNameCase,
      );
      origHeaders.forEach((original, i) => {
        if (original !== sanitized[i]) {
          sanitizedToOriginal.set(sanitized[i], original);
        }
      });
      nonEmptyRows = filteredRows.map((row) => {
        // Defense-in-depth: a null-prototype target means an attacker-chosen
        // header literally named "__proto__"/"constructor"/"prototype" can
        // only ever create a harmless own property, never touch
        // Object.prototype (#1199).
        const out: CSVRow = Object.create(null);
        origHeaders.forEach((h, i) => {
          out[sanitized[i]] = row[h];
        });
        return out;
      });
      structuredColumnNameMapping = mapping.length > 0 ? mapping : undefined;
    }

    // Extract metadata from parsed results
    const rowCount = nonEmptyRows.length;
    const columnNames =
      nonEmptyRows.length > 0 ? Object.keys(nonEmptyRows[0]) : [];
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

    // #378: carry the pre-sanitization header on each renamed column.
    if (sanitizedToOriginal.size > 0) {
      for (const col of columnMetadata) {
        const original = sanitizedToOriginal.get(col.name);
        if (original) {
          col.originalName = original;
        }
      }
    }

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
        confidence: csvResultConfidence(dataQualityScore),
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
        hasHeaders: detectHasHeaders(columnNames, nonEmptyRows),
        detectedDelimiter: delimiter,
        detectedEncoding,
        encodingConfidence,
        ...(structuredColumnNameMapping
          ? { columnNameMapping: structuredColumnNameMapping }
          : {}),
        ...(structuredTimedOut ? { parseTimedOut: true } : {}),
      },
    };
  }

  /**
   * Detect the delimiter of DSV content (comma/tab/semicolon/pipe), respecting
   * RFC-4180 quoting. An optional extension hint (`tsv` → tab, `psv` → pipe)
   * breaks ambiguity. Used by callers (e.g. the RAG CSV loader) that parse
   * DSV content themselves and need the same detection (#361). A leading
   * Excel `sep=` metadata line is stripped before sampling so it can't skew
   * detection, and an explicit `sep=<char>` value wins outright.
   */
  static detectDelimiter(csvString: string, extensionHint?: string): string {
    const { dataLines, explicitDelimiter } = stripMetadataLine(
      splitCsvLines(stripBom(csvString)),
    );
    return explicitDelimiter ?? detectDelimiterUtil(dataLines, extensionHint);
  }

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
    timeoutMs: number = DEFAULT_CSV_FILE_PARSE_TIMEOUT_MS,
  ): Promise<CSVRow[]> {
    const { rows } = await this.parseCSVFileWithMeta(
      filePath,
      maxRows,
      timeoutMs,
    );
    return rows;
  }

  /**
   * File-parse variant that also reports whether the parse timed out, used by
   * `process()` to surface `metadata.parseTimedOut`.
   */
  static async parseCSVFileWithMeta(
    filePath: string,
    maxRows: number = 1000,
    timeoutMs: number = DEFAULT_CSV_FILE_PARSE_TIMEOUT_MS,
    encoding?: string,
  ): Promise<{ rows: CSVRow[]; timedOut: boolean }> {
    if (typeof filePath !== "string" || filePath.trim().length === 0) {
      throw ErrorFactory.csvInvalidInput(
        "CSVProcessor.parseCSVFile: filePath must be a non-empty string",
      );
    }
    const clampedMaxRows = Math.max(1, Math.min(10000, maxRows));
    const fs = await import("fs");
    // #1199: a single wall-clock deadline covers access() + prepareFileSource()
    // + streamParse() together, not just the streamParse phase — otherwise a
    // stalled disk/network filesystem during the open/peek steps defeats the
    // #379 timeout guard entirely.
    const startTime = Date.now();
    const remaining = () => Math.max(0, timeoutMs - (Date.now() - startTime));

    logger.debug("[CSVProcessor] Starting file parsing", {
      filePath,
      maxRows: clampedMaxRows,
    });

    // #375: a bad path (ENOENT/EACCES) should fail fast with clear context
    // instead of a raw Node error surfacing from the stream. access() is a
    // permission check, not a content read, so #368's single-read contract
    // (one createReadStream, no second full pass) is preserved. Metadata-line
    // and delimiter (#361) detection happen inside prepareFileSource() below,
    // from the same peeked bytes used for encoding detection — not a second
    // read of the file.
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.csvFileAccessFailed(
        `[CSVProcessor] Failed to open CSV file (${filePath}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        error instanceof Error ? error : undefined,
      );
    }

    // #368: a SINGLE createReadStream. We peek its leading bytes to sniff the
    // encoding (#362) and detect a metadata line + delimiter (#361), then
    // replay those bytes back onto the same stream — no second disk read.
    const rawSource = fs.createReadStream(filePath);
    let prepared: { source: Readable; skipLines: number; delimiter: string };
    try {
      prepared = await withTimeout(
        this.prepareFileSource(rawSource, encoding, extname(filePath)),
        remaining(),
        "[CSVProcessor] Timed out preparing CSV file source",
      );
    } catch (error) {
      rawSource.destroy();
      if (error instanceof TimeoutError) {
        // Same contract as streamParse's own timeout path (#379): report a
        // clean partial result instead of throwing, so the whole call never
        // hangs OR surfaces a timeout as an exception.
        logger.warn(
          `[CSVProcessor] Prepare phase exceeded the ${timeoutMs}ms parse budget for ${filePath}; returning an empty partial result`,
        );
        return { rows: [], timedOut: true };
      }
      throw ErrorFactory.csvParseFailed(
        buildCsvParseErrorMessage({
          stage: "read",
          count: 0,
          location: filePath,
          cause: error instanceof Error ? error.message : String(error),
        }),
        { filePath },
        error instanceof Error ? error : undefined,
      );
    }

    return this.streamParse(prepared.source, rawSource, {
      maxRows: clampedMaxRows,
      skipLines: prepared.skipLines,
      timeoutMs: remaining(),
      location: filePath,
      delimiter: prepared.delimiter,
    });
  }

  /**
   * Peek the head of a raw file stream to resolve encoding, metadata-line
   * skipping, and the delimiter (#361), then return a decoded text stream
   * that still delivers the whole file from byte 0 (via `unshift`) — a
   * single disk read (#368/#362).
   */
  private static prepareFileSource(
    rawSource: Readable,
    encodingOverride?: string,
    extensionHint?: string,
  ): Promise<{ source: Readable; skipLines: number; delimiter: string }> {
    return new Promise((resolve, reject) => {
      const PEEK_LIMIT = 64 * 1024;
      const chunks: Buffer[] = [];
      let total = 0;
      let settled = false;

      const cleanup = () => {
        rawSource.removeListener("data", onData);
        rawSource.removeListener("end", onEnd);
        rawSource.removeListener("error", onError);
      };

      // #361: resolve the metadata-line skip count and the delimiter
      // together from the same peeked/decoded text — an explicit `sep=`
      // line wins outright, otherwise fall back to frequency-based
      // detection (+ the file extension as a tie-breaker) over the
      // post-metadata lines.
      const resolveMeta = (
        text: string,
      ): {
        hasMetadataLine: boolean;
        dataLines: string[];
        delimiter: string;
      } => {
        const { dataLines, hasMetadataLine, explicitDelimiter } =
          stripMetadataLine(splitCsvLines(text));
        const delimiter =
          explicitDelimiter ?? detectDelimiterUtil(dataLines, extensionHint);
        return { hasMetadataLine, dataLines, delimiter };
      };

      const onData = (chunk: Buffer) => {
        chunks.push(chunk);
        total += chunk.length;
        const head = Buffer.concat(chunks);
        // isCompleteBuffer=false: `head` is only a peek, not necessarily the
        // whole file (#1199) — see the confidence note on decodeBuffer.
        const { text, encoding } = decodeBuffer(head, encodingOverride, false);
        if (splitCsvLines(text).length >= 2 || total >= PEEK_LIMIT) {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          const { hasMetadataLine, delimiter } = resolveMeta(text);
          // Replay the consumed head bytes, then decode the full raw stream.
          // NOTE (#1282): the encoding is committed from the peeked head to keep
          // the parse streaming (which the parse-timeout guard #379 relies on).
          // A file whose head is pure ASCII but which switches to a legacy
          // encoding only later would be read as UTF-8; pass `encoding`
          // explicitly for such files.
          rawSource.pause();
          rawSource.unshift(head);
          const decodeStream = iconv.decodeStream(encoding) as Transform;
          rawSource.on("error", (e) => decodeStream.destroy(e));
          resolve({
            source: rawSource.pipe(decodeStream),
            skipLines: hasMetadataLine ? 1 : 0,
            delimiter,
          });
        }
      };

      const onEnd = () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        // Whole (small) file already buffered — decode it directly. unshift on
        // an ended stream throws, so replay via an in-memory Readable instead.
        const head = Buffer.concat(chunks);
        const { text } = decodeBuffer(head, encodingOverride);
        const { hasMetadataLine, dataLines, delimiter } = resolveMeta(text);
        const data = hasMetadataLine ? dataLines.join("\n") : text;
        resolve({ source: Readable.from([data]), skipLines: 0, delimiter });
      };

      const onError = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      rawSource.on("data", onData);
      rawSource.on("end", onEnd);
      rawSource.on("error", onError);
    });
  }

  /**
   * Parse CSV string to array of row objects
   * Exposed for use by tools that need direct CSV parsing
   *
   * @param csvString - CSV data as string
   * @param maxRows - Maximum rows to parse (default: 1000)
   * @param timeoutMs - Wall-clock parse cap; returns partial rows on timeout
   * @returns Array of row objects
   */
  static async parseCSVString(
    csvString: string,
    maxRows: number = 1000,
    timeoutMs: number = DEFAULT_CSV_STRING_PARSE_TIMEOUT_MS,
  ): Promise<CSVRow[]> {
    const { rows } = await this.parseCSVStringWithMeta(
      csvString,
      maxRows,
      timeoutMs,
    );
    return rows;
  }

  /**
   * String-parse variant that also reports whether the parse timed out, used by
   * `process()` to surface `metadata.parseTimedOut`.
   */
  static async parseCSVStringWithMeta(
    csvString: string,
    maxRows: number = 1000,
    timeoutMs: number = DEFAULT_CSV_STRING_PARSE_TIMEOUT_MS,
  ): Promise<{ rows: CSVRow[]; timedOut: boolean }> {
    if (typeof csvString !== "string" || csvString.trim().length === 0) {
      throw ErrorFactory.csvInvalidInput(
        "CSVProcessor.parseCSVString: csvString must be a non-empty string",
      );
    }
    // Strip a leading UTF-8 BOM (common in Excel exports) so it does not glue
    // onto the first column name and break downstream key lookups.
    const normalized = stripBom(csvString);
    const clampedMaxRows = Math.max(1, Math.min(10000, maxRows));

    logger.debug("[CSVProcessor] Starting string parsing", {
      inputLength: normalized.length,
      maxRows: clampedMaxRows,
    });

    // Detect and skip a leading metadata line before detecting the
    // delimiter, so a `sep=` preamble can't skew detection (#361). No
    // caller currently needs to override the delimiter here (#1192's own
    // tests rely on self-detection), so it's always auto-detected.
    const lines = splitCsvLines(normalized);
    const { dataLines, hasMetadataLine, explicitDelimiter } =
      stripMetadataLine(lines);
    const effectiveDelimiter =
      explicitDelimiter ?? detectDelimiterUtil(dataLines);

    if (hasMetadataLine) {
      logger.debug("[CSVProcessor] Detected metadata line in string, skipping");
    }

    const csvData = dataLines.join("\n");
    if (csvData.trim().length === 0) {
      throw ErrorFactory.csvInvalidInput(
        "CSVProcessor.parseCSVString: csvString must be a non-empty string",
      );
    }

    return this.streamParse(Readable.from([csvData]), undefined, {
      maxRows: clampedMaxRows,
      skipLines: 0,
      timeoutMs,
      delimiter: effectiveDelimiter,
    });
  }

  /**
   * Shared streaming consumer for both parse methods. Guarantees:
   *  - source, rawSource, and parser are all destroyed on ANY settle path
   *    (#371) — `rawSource` matters for the file-parse path, where `source`
   *    is a decode Transform piped FROM `rawSource`; `.pipe()` does not
   *    propagate `.destroy()` upstream, so without this the underlying
   *    `fs.createReadStream` fd would leak on abort/timeout/error,
   *  - a wall-clock timeout returns partial rows instead of hanging (#379),
   *  - every row is validated at the boundary (#384),
   *  - reject messages carry columns/last-row-shape/format context (#375),
   *  - the delimiter (#361, comma/tab/semicolon/pipe) detected by the caller
   *    is honored, instead of csv-parser's hard-coded comma default.
   *
   * @param rawSource - The original file stream `source` was piped from, when
   *   applicable (file-parse path only; `undefined` for string parsing).
   */
  private static streamParse(
    source: Readable,
    rawSource: Readable | undefined,
    opts: {
      maxRows: number;
      skipLines: number;
      timeoutMs: number;
      location?: string;
      delimiter?: string;
      /**
       * When true, blank/whitespace-only rows are dropped and do not count
       * toward `maxRows` (#373 structured path).
       */
      skipEmptyRows?: boolean;
    },
  ): Promise<{ rows: CSVRow[]; timedOut: boolean }> {
    return new Promise((resolve, reject) => {
      const rows: CSVRow[] = [];
      let count = 0;
      let settled = false;
      let capturedHeaders: string[] | undefined;
      let lastRowColumnCount: number | undefined;
      const startTime = Date.now();

      // maxRowBytes bounds a single-row allocation (#371) — without it a
      // pathological unbroken row grows memory unbounded and never errors.
      // skipLines drops any pre-header metadata line (e.g. Excel's `sep=,`)
      // BEFORE csv-parser reads the header, so the real header is used.
      // separator (#361) defaults to comma when the caller has no better
      // signal, matching csv-parser's own default.
      const parser = csvParser({
        separator: opts.delimiter ?? ",",
        maxRowBytes: CSV_MAX_ROW_BYTES,
        ...(opts.skipLines > 0 ? { skipLines: opts.skipLines } : {}),
      });

      const abort = () => {
        source.destroy();
        rawSource?.destroy();
        parser.destroy();
      };
      const finish = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        finish(() => {
          logger.warn(
            `[CSVProcessor] Parse timed out after ${Date.now() - startTime}ms with ${rows.length} partial row(s)`,
          );
          abort();
          resolve({ rows, timedOut: true });
        });
      }, opts.timeoutMs);
      if (typeof timer.unref === "function") {
        timer.unref();
      }

      parser.on("headers", (h: string[]) => {
        capturedHeaders = h;
      });

      // .pipe() does not forward source errors (disk/permission failures) to
      // the destination, so listen on the source directly or it throws.
      source.on("error", (error: Error) => {
        finish(() => {
          abort();
          reject(
            ErrorFactory.csvParseFailed(
              buildCsvParseErrorMessage({
                stage: "read",
                count,
                headerCount: capturedHeaders?.length,
                lastRowColumnCount,
                location: opts.location,
                cause: error.message,
              }),
              { location: opts.location, rowCount: count },
              error,
            ),
          );
        });
      });

      source
        .pipe(parser)
        .on("data", (row: unknown) => {
          try {
            assertValidCsvRow(row, count + 1);
          } catch (err) {
            finish(() => {
              abort();
              reject(err as Error);
            });
            return;
          }
          // #373: blank rows must not consume maxRows when skipping empties.
          if (opts.skipEmptyRows && isBlankCsvDataRow(row)) {
            return;
          }
          lastRowColumnCount = Object.keys(row).length;
          rows.push(row);
          count++;

          if (count >= opts.maxRows) {
            logger.debug(
              `[CSVProcessor] Reached row limit ${opts.maxRows}, stopping parse`,
            );
            finish(() => {
              abort();
              resolve({ rows, timedOut: false });
            });
          }
        })
        .on("end", () => {
          finish(() => {
            logger.debug(
              `[CSVProcessor] Parsing complete: ${rows.length} rows parsed`,
            );
            resolve({ rows, timedOut: false });
          });
        })
        .on("error", (error: Error) => {
          // #371: destroy the source too — .pipe() does NOT auto-destroy the
          // upstream when the parser Transform errors, leaking the fd/stream.
          finish(() => {
            abort();
            logger.error("[CSVProcessor] Parsing failed:", error);
            reject(
              ErrorFactory.csvParseFailed(
                buildCsvParseErrorMessage({
                  stage: "parse",
                  count,
                  headerCount: capturedHeaders?.length,
                  lastRowColumnCount,
                  location: opts.location,
                  cause: error.message,
                }),
                { location: opts.location, rowCount: count },
                error,
              ),
            );
          });
        });
    });
  }

  /**
   * Format parsed CSV data for LLM consumption
   * Only used for JSON and Markdown formats (raw format handled separately)
   */
  private static formatForLLM(
    rows: CSVRow[],
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
    rows: CSVRow[],
    includeHeaders: boolean,
  ): string {
    if (rows.length === 0) {
      return "CSV file is empty or contains no data.";
    }

    const headers = Object.keys(rows[0]);

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
        headers.map((h) => escapePipe(String(row[h] || ""))).join(" | ") +
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
    sampleRows: CSVRow[],
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
  private static toCSVString(rows: CSVRow[], includeHeaders: boolean): string {
    if (rows.length === 0) {
      return "";
    }

    const headers = Object.keys(rows[0]);

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
      const values = headers.map((h) => escapeCSV(String(row[h] ?? "")));
      lines.push(values.join(","));
    });

    return lines.join("\n");
  }
}
