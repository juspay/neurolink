[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedFileBase

# Type Alias: ProcessedFileBase

> **ProcessedFileBase** = `object`

Defined in: [types/processor.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L79)

Base interface for processed file data.
All specific processed types should extend this interface.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/processor.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L81)

File content as a Buffer

---

### mimetype

> **mimetype**: `string`

Defined in: [types/processor.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L83)

MIME type of the processed content

---

### size

> **size**: `number`

Defined in: [types/processor.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L85)

Size of the processed content in bytes

---

### filename

> **filename**: `string`

Defined in: [types/processor.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L87)

Filename (may be normalized or sanitized)
