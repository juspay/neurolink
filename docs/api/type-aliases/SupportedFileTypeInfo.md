[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:1024](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1024)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1026)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1028)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1030)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1032)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1034)

Optional description
