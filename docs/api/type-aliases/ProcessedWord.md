[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedWord

# Type Alias: ProcessedWord

> **ProcessedWord** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L758)

Processed Word document result.

## Type Declaration

### textContent

> **textContent**: `string`

Extracted plain text content from the Word document

### htmlContent

> **htmlContent**: `string`

HTML representation of the Word document

### warnings

> **warnings**: `string`[]

Warnings from mammoth extraction (e.g., unsupported elements)
