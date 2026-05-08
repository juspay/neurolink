[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawFileInput

# Type Alias: RawFileInput

> **RawFileInput** = `object`

Defined in: [types/context.ts:770](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L770)

Raw file input before text extraction.

## Properties

### content

> **content**: `string` \| `Buffer`

Defined in: [types/context.ts:772](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L772)

File content -- either a UTF-8 string or a raw Buffer

---

### mimeType

> **mimeType**: `string`

Defined in: [types/context.ts:774](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L774)

MIME type (e.g. "application/pdf", "text/plain")

---

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:776](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L776)

Display file name

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:778](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L778)

Original byte size on disk (optional)
