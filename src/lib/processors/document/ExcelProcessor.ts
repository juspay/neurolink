/**
 * Excel Processor
 *
 * Handles downloading, validating, and processing Excel files (.xlsx, .xls).
 * Uses exceljs library for parsing with streaming support for large files.
 *
 * Key features:
 * - Supports both .xlsx and legacy .xls formats
 * - Extracts worksheet data with headers
 * - Handles complex cell types (formulas, rich text, dates)
 * - Respects configurable row and sheet limits
 * - Provides truncation metadata when limits are exceeded
 *
 * @module processors/document/ExcelProcessor
 *
 * @example
 * ```typescript
 * import { excelProcessor, processExcel, isExcelFile } from "./ExcelProcessor.js";
 *
 * // Check if a file is an Excel file
 * if (isExcelFile(fileInfo.mimetype, fileInfo.name)) {
 *   // Process the Excel file
 *   const result = await processExcel(fileInfo, {
 *     authHeaders: { Authorization: "Bearer token" },
 *   });
 *
 *   if (result.success) {
 *     console.log(`Processed ${result.data.sheetCount} sheets`);
 *     console.log(`Total rows: ${result.data.totalRows}`);
 *
 *     for (const sheet of result.data.worksheets) {
 *       console.log(`Sheet: ${sheet.name}, Rows: ${sheet.rowCount}`);
 *     }
 *   }
 * }
 * ```
 */

import ExcelJS from "exceljs";

const { Workbook } = ExcelJS;
type CellValue = ExcelJS.CellValue;

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS } from "../config/index.js";
import { FileErrorCode } from "../errors/index.js";

// Re-export for consumers who import from this module
export type { ExcelWorksheet, ProcessedExcel } from "../base/types.js";

// Import for local use
import type { ExcelWorksheet, ProcessedExcel } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported MIME types for Excel files */
const SUPPORTED_EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
] as const;

/** Supported file extensions for Excel files */
const SUPPORTED_EXCEL_EXTENSIONS = [".xlsx", ".xls"] as const;

// =============================================================================
// EXCEL PROCESSOR CLASS
// =============================================================================

/**
 * Excel Processor - handles .xlsx and .xls files.
 * Uses exceljs library for parsing with support for large files.
 *
 * Features:
 * - ZIP format validation (XLSX files are ZIP archives)
 * - Sheet count limiting (MAX_EXCEL_SHEETS)
 * - Row count limiting per sheet (MAX_EXCEL_ROWS)
 * - Cell type handling (text, numbers, formulas, dates, rich text)
 *
 * @example
 * ```typescript
 * const processor = new ExcelProcessor();
 *
 * // Process a file
 * const result = await processor.processFile(fileInfo, {
 *   authHeaders: { Authorization: "Bearer token" },
 * });
 *
 * if (result.success) {
 *   console.log(`Sheets: ${result.data.sheetCount}`);
 *   console.log(`Truncated: ${result.data.truncated}`);
 * }
 * ```
 */
export class ExcelProcessor extends BaseFileProcessor<ProcessedExcel> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.EXCEL_MAX_MB,
      timeoutMs: 60000, // Excel parsing can take longer than text files
      supportedMimeTypes: [...SUPPORTED_EXCEL_TYPES],
      supportedExtensions: [...SUPPORTED_EXCEL_EXTENSIONS],
      fileTypeName: "Excel",
      defaultFilename: "spreadsheet.xlsx",
    });
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  /**
   * Validate downloaded Excel file has correct format.
   * XLSX files are ZIP archives starting with PK signature.
   *
   * @param buffer - Downloaded file content
   * @param _fileInfo - Original file information (unused but required by interface)
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    // Check minimum size
    if (buffer.length < 4) {
      return "Invalid Excel file - file too small";
    }

    // XLSX files are ZIP archives (PK signature: 0x50 0x4B)
    const pkSignature = buffer.subarray(0, 2).toString("ascii");

    if (pkSignature !== "PK") {
      // Provide helpful error for common issues
      const preview = buffer
        .subarray(0, 100)
        .toString("utf8")
        .substring(0, 100);
      if (preview.includes("<!DOCTYPE") || preview.includes("<html")) {
        return "Invalid Excel file - received HTML response instead of file content";
      }
      return "Invalid Excel file - not a valid XLSX format (missing PK signature)";
    }

    return null;
  }

  // ===========================================================================
  // PROCESSING
  // ===========================================================================

  /**
   * Build processed result stub.
   * Note: This is a synchronous stub - actual parsing happens in processFile override.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Empty ProcessedExcel structure (populated by processFile)
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedExcel {
    return {
      worksheets: [],
      buffer,
      mimetype:
        fileInfo.mimetype ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
      sheetCount: 0,
      totalRows: 0,
      truncated: false,
      truncatedSheets: [],
    };
  }

  /**
   * Override processFile for async Excel parsing with exceljs.
   * This override is necessary because exceljs uses async parsing.
   *
   * @param fileInfo - File information (can include URL or buffer)
   * @param options - Optional processing options (auth headers, timeout, etc.)
   * @returns Processing result with parsed Excel data or error
   */
  override async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<FileProcessingResult<ProcessedExcel>> {
    try {
      // Step 1: Validate file type and size
      const validationResult = this.validateFileWithResult(fileInfo);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Step 2: Get file buffer (from direct buffer or download from URL)
      let buffer: Buffer;

      if (fileInfo.buffer) {
        buffer = fileInfo.buffer;
      } else if (fileInfo.url) {
        const downloadResult = await this.downloadFileWithRetry(
          fileInfo,
          options,
        );
        if (!downloadResult.success) {
          return {
            success: false,
            error: downloadResult.error,
          };
        }
        if (!downloadResult.data) {
          return {
            success: false,
            error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
              reason: "Download succeeded but returned no data",
            }),
          };
        }
        buffer = downloadResult.data;
      } else {
        return {
          success: false,
          error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
            reason: "No buffer or URL provided for file",
          }),
        };
      }

      // Step 3: Validate downloaded file (magic bytes check)
      const postValidationResult = await this.validateDownloadedFileWithResult(
        buffer,
        fileInfo,
      );
      if (!postValidationResult.success) {
        return {
          success: false,
          error: postValidationResult.error,
        };
      }

      // Step 4: Parse Excel file asynchronously using exceljs
      const workbook = await this.parseWorkbook(buffer);

      // Step 5: Extract worksheet data with limits
      const { worksheets, truncated, truncatedSheets } =
        this.extractWorksheets(workbook);

      // Calculate total rows across all worksheets
      const totalRows = worksheets.reduce(
        (sum, sheet) => sum + sheet.rowCount,
        0,
      );

      // Build final result
      return {
        success: true,
        data: {
          worksheets,
          buffer,
          mimetype:
            fileInfo.mimetype ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: fileInfo.size,
          filename: this.getFilename(fileInfo),
          sheetCount: worksheets.length,
          totalRows,
          truncated,
          truncatedSheets,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError(
          FileErrorCode.PROCESSING_FAILED,
          {
            fileType: "Excel",
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Parse Excel buffer into workbook using exceljs.
   *
   * @param buffer - Excel file content
   * @returns Parsed ExcelJS Workbook
   */
  private async parseWorkbook(
    buffer: Buffer,
  ): Promise<InstanceType<typeof Workbook>> {
    const workbook = new Workbook();
    // ExcelJS load() types expect Buffer but Node 22+ Buffer<ArrayBufferLike>
    // is not directly assignable. Extract a clean ArrayBuffer for the exact
    // byte range via slice, then cast for type compatibility.
    await workbook.xlsx.load(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );
    return workbook;
  }

  /**
   * Extract worksheet data from workbook with row and sheet limits.
   *
   * @param workbook - Parsed ExcelJS Workbook
   * @returns Extracted worksheets with truncation metadata
   */
  private extractWorksheets(workbook: InstanceType<typeof Workbook>): {
    worksheets: ExcelWorksheet[];
    truncated: boolean;
    truncatedSheets: string[];
  } {
    const worksheets: ExcelWorksheet[] = [];
    const truncatedSheets: string[] = [];
    let truncated = false;

    const maxRows = SIZE_LIMITS.EXCEL_MAX_ROWS;
    const maxSheets = SIZE_LIMITS.EXCEL_MAX_SHEETS;

    let sheetIndex = 0;

    for (const worksheet of workbook.worksheets) {
      // Check sheet limit
      if (sheetIndex >= maxSheets) {
        truncated = true;
        break;
      }

      const rows: (string | number | boolean | null)[][] = [];
      let headers: string[] = [];
      let rowIndex = 0;
      let hitLimit = false;

      worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (hitLimit) {
          return;
        }

        // Check row limit
        if (rowIndex >= maxRows) {
          if (!truncatedSheets.includes(worksheet.name)) {
            truncatedSheets.push(worksheet.name);
          }
          truncated = true;
          hitLimit = true;
          return;
        }

        // ExcelJS row.values is 1-indexed, so first element is undefined
        const rowValues = row.values as (
          | string
          | number
          | boolean
          | null
          | undefined
          | CellValue
        )[];

        // Convert cell values to primitive types and remove the first undefined element
        const cleanRow = rowValues
          .slice(1)
          .map((cell) => this.getCellValue(cell));

        // Extract headers from first row
        if (rowNumber === 1) {
          headers = cleanRow.map((v) => String(v ?? ""));
        }

        rows.push(cleanRow);
        rowIndex++;
      });

      worksheets.push({
        name: worksheet.name,
        rows,
        headers,
        rowCount: rows.length,
        columnCount: headers.length || (rows[0]?.length ?? 0),
      });

      sheetIndex++;
    }

    return { worksheets, truncated, truncatedSheets };
  }

  /**
   * Convert an Excel cell value to a primitive type.
   * Handles various cell types including formulas, rich text, and dates.
   *
   * @param cell - ExcelJS cell value (can be various types)
   * @returns Primitive value (string, number, boolean, or null)
   */
  private getCellValue(cell: unknown): string | number | boolean | null {
    if (cell === null || cell === undefined) {
      return null;
    }

    // Handle primitive types directly
    if (
      typeof cell === "string" ||
      typeof cell === "number" ||
      typeof cell === "boolean"
    ) {
      return cell;
    }

    // Handle Date objects
    if (cell instanceof Date) {
      return cell.toISOString();
    }

    // Handle ExcelJS cell objects
    if (typeof cell === "object" && cell !== null) {
      const cellObj = cell as {
        text?: string;
        result?: unknown;
        richText?: Array<{ text?: string }>;
        formula?: string;
        hyperlink?: string;
      };

      // Formula result (prioritize result over formula string)
      if ("result" in cellObj && cellObj.result !== undefined) {
        if (typeof cellObj.result === "object" && cellObj.result !== null) {
          // Handle error values like { error: '#VALUE!' }
          if ("error" in (cellObj.result as object)) {
            return String((cellObj.result as { error: string }).error);
          }
        }
        return typeof cellObj.result === "string" ||
          typeof cellObj.result === "number" ||
          typeof cellObj.result === "boolean"
          ? cellObj.result
          : String(cellObj.result);
      }

      // Rich text
      if ("richText" in cellObj && Array.isArray(cellObj.richText)) {
        return this.extractRichText(cellObj.richText);
      }

      // Simple text value
      if ("text" in cellObj && cellObj.text !== undefined) {
        return cellObj.text;
      }

      // Hyperlink (return the display text or URL)
      if ("hyperlink" in cellObj && cellObj.hyperlink) {
        return cellObj.text || cellObj.hyperlink;
      }
    }

    // Fallback: convert to string
    return String(cell);
  }

  /**
   * Extract text from rich text cell format.
   * Rich text cells contain an array of text fragments with formatting.
   *
   * @param richText - Array of rich text fragments
   * @returns Concatenated plain text
   */
  private extractRichText(richText: unknown): string {
    if (!Array.isArray(richText)) {
      return "";
    }

    return richText
      .map((rt) => {
        if (typeof rt === "object" && rt !== null && "text" in rt) {
          return (rt as { text?: string }).text || "";
        }
        return "";
      })
      .join("");
  }

  // ===========================================================================
  // TARGETED EXTRACTION API
  // ===========================================================================

  /**
   * Extract a specific range from a spreadsheet.
   *
   * Called by the `extract_file_content` tool for targeted data access.
   * Returns TSV-formatted text for the specified sheet, row range, and columns.
   *
   * @param buffer - Excel file buffer
   * @param sheet - Sheet name or 0-based index (default: first sheet)
   * @param rowStart - Starting row (1-indexed, default: 1)
   * @param rowEnd - Ending row (1-indexed, default: all rows)
   * @param columns - Specific column letters to include (e.g., ["A", "B", "D"])
   * @returns TSV-formatted string with the extracted data
   */
  async extractSheetRange(
    buffer: Buffer,
    sheet?: string | number,
    rowStart: number = 1,
    rowEnd?: number,
    columns?: string[],
  ): Promise<string> {
    const workbook = await this.parseWorkbook(buffer);

    // Resolve the target worksheet
    let worksheet: ExcelJS.Worksheet | undefined;
    if (typeof sheet === "number") {
      // exceljs worksheets are 1-indexed
      worksheet = workbook.worksheets[sheet];
    } else if (typeof sheet === "string") {
      worksheet = workbook.getWorksheet(sheet);
    } else {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      const sheetNames = workbook.worksheets.map((ws) => ws.name).join(", ");
      return `Sheet not found. Available sheets: ${sheetNames}`;
    }

    // Convert column letters to 1-based column indices if specified
    const columnIndices: number[] | undefined = columns?.map((col) => {
      let index = 0;
      for (let i = 0; i < col.length; i++) {
        index = index * 26 + col.toUpperCase().charCodeAt(i) - 64;
      }
      return index;
    });

    const lines: string[] = [];
    lines.push(`## Sheet: ${worksheet.name}`);

    const actualRowEnd = rowEnd ?? worksheet.rowCount;
    let rowCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < rowStart || rowNumber > actualRowEnd) {
        return;
      }
      rowCount++;

      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (columnIndices && !columnIndices.includes(colNumber)) {
          return;
        }
        const val = this.getCellValue(cell.value as CellValue);
        values.push(val === null ? "" : String(val));
      });

      // Add row number prefix for easy reference
      lines.push(`${rowNumber}\t${values.join("\t")}`);
    });

    if (rowCount === 0) {
      lines.push(`(No data in rows ${rowStart}-${actualRowEnd})`);
    } else {
      lines.push(`\n(${rowCount} rows, range ${rowStart}-${actualRowEnd})`);
    }

    return lines.join("\n");
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Excel processor instance.
 * Use this for standard Excel processing operations.
 *
 * @example
 * ```typescript
 * import { excelProcessor } from "./ExcelProcessor.js";
 *
 * const result = await excelProcessor.processFile(fileInfo);
 * ```
 */
export const excelProcessor = new ExcelProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an Excel file.
 * Matches by MIME type or file extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is an Excel file
 *
 * @example
 * ```typescript
 * if (isExcelFile("application/vnd.ms-excel", "data.xls")) {
 *   // Process as Excel
 * }
 *
 * if (isExcelFile("", "report.xlsx")) {
 *   // Also matches by extension
 * }
 * ```
 */
export function isExcelFile(mimetype: string, filename: string): boolean {
  return excelProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate Excel file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the Excel file limit
 *
 * @example
 * ```typescript
 * if (!validateExcelSize(fileInfo.size)) {
 *   console.error(`File too large: max ${SIZE_LIMITS.EXCEL_MAX_MB}MB`);
 * }
 * ```
 */
export function validateExcelSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.EXCEL_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single Excel file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, etc.)
 * @returns Processing result with parsed Excel data or error
 *
 * @example
 * ```typescript
 * import { processExcel } from "./ExcelProcessor.js";
 *
 * const result = await processExcel(fileInfo, {
 *   authHeaders: { Authorization: "Bearer token" },
 *   timeout: 120000, // 2 minutes for large files
 * });
 *
 * if (result.success) {
 *   const { worksheets, totalRows, truncated } = result.data;
 *   console.log(`Extracted ${totalRows} rows from ${worksheets.length} sheets`);
 *
 *   if (truncated) {
 *     console.warn("Some data was truncated due to size limits");
 *   }
 * } else {
 *   console.error(`Processing failed: ${result.error?.userMessage}`);
 * }
 * ```
 */
export async function processExcel(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedExcel>> {
  return excelProcessor.processFile(fileInfo, options);
}

/**
 * Get Excel max size in MB.
 *
 * @returns Maximum Excel file size in megabytes
 *
 * @example
 * ```typescript
 * const maxSize = getExcelMaxSizeMB(); // 10
 * console.log(`Maximum Excel file size: ${maxSize}MB`);
 * ```
 */
export function getExcelMaxSizeMB(): number {
  return SIZE_LIMITS.EXCEL_MAX_MB;
}

/**
 * Get Excel max rows per sheet.
 *
 * @returns Maximum rows to process per worksheet
 *
 * @example
 * ```typescript
 * const maxRows = getExcelMaxRows(); // 5000
 * console.log(`Maximum rows per sheet: ${maxRows}`);
 * ```
 */
export function getExcelMaxRows(): number {
  return SIZE_LIMITS.EXCEL_MAX_ROWS;
}

/**
 * Get Excel max sheets to process.
 *
 * @returns Maximum number of worksheets to process
 *
 * @example
 * ```typescript
 * const maxSheets = getExcelMaxSheets(); // 10
 * console.log(`Maximum sheets to process: ${maxSheets}`);
 * ```
 */
export function getExcelMaxSheets(): number {
  return SIZE_LIMITS.EXCEL_MAX_SHEETS;
}
