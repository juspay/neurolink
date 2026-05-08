[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedOpenDocument

# Type Alias: ProcessedOpenDocument

> **ProcessedOpenDocument** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L574)

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
