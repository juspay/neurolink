[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSourceCode

# Type Alias: ProcessedSourceCode

> **ProcessedSourceCode** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:544](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L544)

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
