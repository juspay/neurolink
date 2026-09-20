[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawFileInput

# Type Alias: RawFileInput

> **RawFileInput** = `object`

Defined in: [types/context.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L772)

Raw file input before text extraction.

## Properties

### content

> **content**: `string` \| `Buffer`

Defined in: [types/context.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L774)

File content -- either a UTF-8 string or a raw Buffer

---

### mimeType

> **mimeType**: `string`

Defined in: [types/context.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L776)

MIME type (e.g. "application/pdf", "text/plain")

---

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L778)

Display file name

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L780)

Original byte size on disk (optional)
