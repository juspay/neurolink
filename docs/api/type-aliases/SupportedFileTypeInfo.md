[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1027)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1029)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1031)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1033)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1035)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1037)

Optional description
