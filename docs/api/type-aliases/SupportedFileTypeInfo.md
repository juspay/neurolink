[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1008)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1010)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1012)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1014)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:1016](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1016)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1018)

Optional description
