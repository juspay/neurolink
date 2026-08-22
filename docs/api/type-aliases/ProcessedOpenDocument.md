[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedOpenDocument

# Type Alias: ProcessedOpenDocument

> **ProcessedOpenDocument** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L574)

Processed OpenDocument result.

## Type Declaration

### textContent

> **textContent**: `string`

Extracted text content

### format

> **format**: `"odt"` \| `"ods"` \| `"odp"` \| `"unknown"`

Document format type

### paragraphCount

> **paragraphCount**: `number`

Number of paragraphs/text elements found

### truncated

> **truncated**: `boolean`

Whether content was truncated
