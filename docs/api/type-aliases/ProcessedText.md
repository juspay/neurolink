[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedText

# Type Alias: ProcessedText

> **ProcessedText** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:610](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L610)

Processed plain text file result.

## Type Declaration

### content

> **content**: `string`

Text content (may be truncated if file is too large)

### lineCount

> **lineCount**: `number`

Total number of lines in the original file

### wordCount

> **wordCount**: `number`

Total number of words in the original file

### encoding

> **encoding**: `string`

Character encoding used to decode the file

### truncated

> **truncated**: `boolean`

Whether the content was truncated due to size limits
