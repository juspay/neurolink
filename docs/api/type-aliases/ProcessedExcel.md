[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedExcel

# Type Alias: ProcessedExcel

> **ProcessedExcel** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:742](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L742)

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
