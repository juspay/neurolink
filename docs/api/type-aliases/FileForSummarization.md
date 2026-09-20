[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileForSummarization

# Type Alias: FileForSummarization

> **FileForSummarization** = `object`

Defined in: [types/context.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L677)

A file prepared for potential summarization.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L679)

Display name (e.g. "report.pdf")

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L681)

Human-readable type label (e.g. "PDF Document")

---

### content

> **content**: `string`

Defined in: [types/context.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L683)

Extracted text content

---

### estimatedTokens

> **estimatedTokens**: `number`

Defined in: [types/context.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L685)

Estimated token count (provider-adjusted)

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/context.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L687)

Optional MIME type

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L689)

Original byte size on disk
