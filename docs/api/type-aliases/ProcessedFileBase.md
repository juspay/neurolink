[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedFileBase

# Type Alias: ProcessedFileBase

> **ProcessedFileBase** = `object`

Base interface for processed file data.
All specific processed types should extend this interface.

## Properties

### buffer

> **buffer**: `Buffer`

File content as a Buffer

---

### mimetype

> **mimetype**: `string`

MIME type of the processed content

---

### size

> **size**: `number`

Size of the processed content in bytes

---

### filename

> **filename**: `string`

Filename (may be normalized or sanitized)
