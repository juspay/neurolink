[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawFileInput

# Type Alias: RawFileInput

> **RawFileInput** = `object`

Defined in: [types/context.ts:793](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L793)

Raw file input before text extraction.

## Properties

### content

> **content**: `string` \| `Buffer`

Defined in: [types/context.ts:795](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L795)

File content -- either a UTF-8 string or a raw Buffer

---

### mimeType

> **mimeType**: `string`

Defined in: [types/context.ts:797](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L797)

MIME type (e.g. "application/pdf", "text/plain")

---

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:799](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L799)

Display file name

---

### originalSize?

> `optional` **originalSize?**: `number`

Defined in: [types/context.ts:801](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L801)

Original byte size on disk (optional)
