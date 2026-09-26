[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1052)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1054)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1056)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1058)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1060)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1062)

Optional description
