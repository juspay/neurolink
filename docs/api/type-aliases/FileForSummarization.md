[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileForSummarization

# Type Alias: FileForSummarization

> **FileForSummarization** = `object`

A file prepared for potential summarization.

## Properties

### fileName

> **fileName**: `string`

Display name (e.g. "report.pdf")

---

### fileType

> **fileType**: `string`

Human-readable type label (e.g. "PDF Document")

---

### content

> **content**: `string`

Extracted text content

---

### estimatedTokens

> **estimatedTokens**: `number`

Estimated token count (provider-adjusted)

---

### mimeType?

> `optional` **mimeType?**: `string`

Optional MIME type

---

### originalSize?

> `optional` **originalSize?**: `number`

Original byte size on disk
