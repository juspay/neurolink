[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedExcel

# Type Alias: ProcessedExcel

> **ProcessedExcel** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:742](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L742)

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
