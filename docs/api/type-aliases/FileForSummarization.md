[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileForSummarization

# Type Alias: FileForSummarization

> **FileForSummarization** = `object`

Defined in: [types/context.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L698)

A file prepared for potential summarization.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:700](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L700)

Display name (e.g. "report.pdf")

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L702)

Human-readable type label (e.g. "PDF Document")

---

### content

> **content**: `string`

Defined in: [types/context.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L704)

Extracted text content

---

### estimatedTokens

> **estimatedTokens**: `number`

Defined in: [types/context.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L706)

Estimated token count (provider-adjusted)

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/context.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L708)

Optional MIME type

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L710)

Original byte size on disk
