[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessorConfig

# Type Alias: FileProcessorConfig

> **FileProcessorConfig** = `object`

Configuration for file processors.
Defines constraints and defaults for a specific file type processor.

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Maximum file size in megabytes

---

### timeoutMs

> **timeoutMs**: `number`

Download/processing timeout in milliseconds

---

### supportedMimeTypes

> **supportedMimeTypes**: `string`[]

List of supported MIME types

---

### supportedExtensions

> **supportedExtensions**: `string`[]

List of supported file extensions (with leading dot)

---

### fileTypeName

> **fileTypeName**: `string`

Human-readable name for this file type (e.g., 'image', 'PDF')

---

### defaultFilename

> **defaultFilename**: `string`

Default filename when original name is not available
