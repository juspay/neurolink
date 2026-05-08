[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileForSummarization

# Type Alias: FileForSummarization

> **FileForSummarization** = `object`

Defined in: [types/context.ts:675](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L675)

A file prepared for potential summarization.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:677](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L677)

Display name (e.g. "report.pdf")

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L679)

Human-readable type label (e.g. "PDF Document")

---

### content

> **content**: `string`

Defined in: [types/context.ts:681](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L681)

Extracted text content

---

### estimatedTokens

> **estimatedTokens**: `number`

Defined in: [types/context.ts:683](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L683)

Estimated token count (provider-adjusted)

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/context.ts:685](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L685)

Optional MIME type

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:687](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L687)

Original byte size on disk
