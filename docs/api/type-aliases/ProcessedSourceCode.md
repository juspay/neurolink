[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedSourceCode

# Type Alias: ProcessedSourceCode

> **ProcessedSourceCode** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:544](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L544)

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
