[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnsupportedFileError

# Type Alias: UnsupportedFileError

> **UnsupportedFileError** = `object`

Detailed error information for unsupported file types.
Provides helpful suggestions for the user.

## Properties

### code

> **code**: `"NO_PROCESSOR_FOUND"` \| `"PROCESSING_FAILED"`

Error code for programmatic handling

---

### message

> **message**: `string`

Human-readable error message

---

### filename

> **filename**: `string`

Original filename

---

### mimetype

> **mimetype**: `string`

MIME type of the file

---

### suggestion

> **suggestion**: `string`

Helpful suggestion for the user

---

### supportedTypes

> **supportedTypes**: `string`[]

List of supported file types
