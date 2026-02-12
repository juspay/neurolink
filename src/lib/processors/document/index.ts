/**
 * Document Processors Module
 *
 * Exports document file processors for Word, Excel, and other document formats.
 * Each processor handles downloading, validating, and extracting content from
 * their respective file types.
 *
 * @module processors/document
 *
 * @example
 * ```typescript
 * import {
 *   // Word documents
 *   WordProcessor,
 *   wordProcessor,
 *   isWordFile,
 *   processWord,
 *   type ProcessedWord,
 *
 *   // Excel spreadsheets
 *   ExcelProcessor,
 *   excelProcessor,
 *   isExcelFile,
 *   processExcel,
 *   type ProcessedExcel,
 *   type ExcelWorksheet,
 * } from "./document/index.js";
 *
 * // Process a Word document
 * if (isWordFile(file.mimetype, file.name)) {
 *   const result = await processWord(fileInfo);
 *   if (result.success) {
 *     console.log("Text:", result.data.textContent);
 *     console.log("HTML:", result.data.htmlContent);
 *   }
 * }
 *
 * // Process an Excel spreadsheet
 * if (isExcelFile(file.mimetype, file.name)) {
 *   const result = await processExcel(fileInfo);
 *   if (result.success) {
 *     console.log(`Sheets: ${result.data.sheetCount}`);
 *     console.log(`Total rows: ${result.data.totalRows}`);
 *     for (const sheet of result.data.worksheets) {
 *       console.log(`  ${sheet.name}: ${sheet.rowCount} rows`);
 *     }
 *   }
 * }
 * ```
 */

// =============================================================================
// WORD PROCESSOR
// =============================================================================

export {
  // Helper functions
  isWordFile,
  // Types
  type ProcessedWord,
  processWord,
  validateWordSize,
  // Class
  WordProcessor,
  // Singleton instance
  wordProcessor,
} from "./WordProcessor.js";

// =============================================================================
// EXCEL PROCESSOR
// =============================================================================

export {
  // Class
  ExcelProcessor,
  // Types
  type ExcelWorksheet,
  // Singleton instance
  excelProcessor,
  // Helper functions
  getExcelMaxRows,
  getExcelMaxSheets,
  getExcelMaxSizeMB,
  isExcelFile,
  type ProcessedExcel,
  processExcel,
  validateExcelSize,
} from "./ExcelProcessor.js";

// =============================================================================
// PPTX PROCESSOR
// =============================================================================

export {
  // Class
  PptxProcessor,
} from "./PptxProcessor.js";

// =============================================================================
// RTF PROCESSOR
// =============================================================================

export {
  // Helper functions
  isRtfFile,
  type ProcessedRtf,
  processRtf,
  // Class
  RtfProcessor,
  // Singleton instance
  rtfProcessor,
  validateRtfSize,
} from "./RtfProcessor.js";

// =============================================================================
// OPENDOCUMENT PROCESSOR
// =============================================================================

export {
  getOpenDocumentMaxSizeMB,
  // Helper functions
  isOpenDocumentFile,
  // Class
  OpenDocumentProcessor,
  // Singleton instance
  openDocumentProcessor,
  type ProcessedOpenDocument,
  processOpenDocument,
  validateOpenDocumentSize,
} from "./OpenDocumentProcessor.js";
