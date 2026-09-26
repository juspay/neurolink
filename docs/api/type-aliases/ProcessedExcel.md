[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedExcel

# Type Alias: ProcessedExcel

> **ProcessedExcel** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Processed Excel file result.

## Type Declaration

### worksheets

> **worksheets**: [`ExcelWorksheet`](ExcelWorksheet.md)[]

Array of processed worksheets

### sheetCount

> **sheetCount**: `number`

Number of sheets processed (may be less than total if truncated)

### totalRows

> **totalRows**: `number`

Total number of rows across all worksheets

### truncated

> **truncated**: `boolean`

Whether any data was truncated due to limits

### truncatedSheets

> **truncatedSheets**: `string`[]

Names of sheets that were truncated
