[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1019)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1021)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1023)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1025)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1027)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1029)

Optional description
