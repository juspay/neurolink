[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessorConfig

# Type Alias: FileProcessorConfig

> **FileProcessorConfig** = `object`

Defined in: [types/processor.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L56)

Configuration for file processors.
Defines constraints and defaults for a specific file type processor.

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/processor.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L58)

Maximum file size in megabytes

---

### timeoutMs

> **timeoutMs**: `number`

Defined in: [types/processor.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L60)

Download/processing timeout in milliseconds

---

### supportedMimeTypes

> **supportedMimeTypes**: `string`[]

Defined in: [types/processor.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L62)

List of supported MIME types

---

### supportedExtensions

> **supportedExtensions**: `string`[]

Defined in: [types/processor.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L64)

List of supported file extensions (with leading dot)

---

### fileTypeName

> **fileTypeName**: `string`

Defined in: [types/processor.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L66)

Human-readable name for this file type (e.g., 'image', 'PDF')

---

### defaultFilename

> **defaultFilename**: `string`

Defined in: [types/processor.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L68)

Default filename when original name is not available
