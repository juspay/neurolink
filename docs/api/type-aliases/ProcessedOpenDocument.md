[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedOpenDocument

# Type Alias: ProcessedOpenDocument

> **ProcessedOpenDocument** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:574](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L574)

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
