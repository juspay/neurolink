[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSourceCode

# Type Alias: ProcessedSourceCode

> **ProcessedSourceCode** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:544](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L544)

Processed source code result.

## Type Declaration

### content

> **content**: `string`

The source code content (may be truncated)

### language

> **language**: `string`

Detected programming language (e.g., "TypeScript", "Python")

### lineCount

> **lineCount**: `number`

Number of lines in the content

### truncated

> **truncated**: `boolean`

Whether the content was truncated due to line limit

### encoding

> **encoding**: `string`

Character encoding used to decode the file
