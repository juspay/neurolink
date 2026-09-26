[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorInfo

# Type Alias: ProcessorInfo

> **ProcessorInfo** = `object`

Information about a registered processor.
Used for discovery and documentation.

## Properties

### name

> **name**: `string`

Unique name for the processor

---

### description

> **description**: `string`

Human-readable description

---

### supportedMimeTypes

> **supportedMimeTypes**: `string`[]

List of supported MIME types

---

### supportedExtensions

> **supportedExtensions**: `string`[]

List of supported file extensions

---

### priority?

> `optional` **priority?**: `number`

Priority level (lower = higher priority)
