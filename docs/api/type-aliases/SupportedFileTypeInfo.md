[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupportedFileTypeInfo

# Type Alias: SupportedFileTypeInfo

> **SupportedFileTypeInfo** = `object`

Defined in: [types/processor.ts:952](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L952)

Information about a supported file type

## Properties

### name

> **name**: `string`

Defined in: [types/processor.ts:954](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L954)

Processor name

---

### priority

> **priority**: `number`

Defined in: [types/processor.ts:956](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L956)

Priority (lower = processed first)

---

### extensions

> **extensions**: `string`[]

Defined in: [types/processor.ts:958](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L958)

Supported file extensions

---

### mimeTypes

> **mimeTypes**: `string`[]

Defined in: [types/processor.ts:960](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L960)

Supported MIME types

---

### description?

> `optional` **description?**: `string`

Defined in: [types/processor.ts:962](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L962)

Optional description
