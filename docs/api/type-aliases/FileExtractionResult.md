[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileExtractionResult

# Type Alias: FileExtractionResult

> **FileExtractionResult** = `object`

Defined in: [types/fileReference.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L234)

Result of targeted content extraction.
May contain text, images, or both depending on the extraction type.

## Properties

### success

> **success**: `boolean`

Defined in: [types/fileReference.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L236)

Whether the extraction succeeded

---

### text?

> `optional` **text?**: `string`

Defined in: [types/fileReference.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L238)

Extracted text content

---

### images?

> `optional` **images?**: `Buffer`[]

Defined in: [types/fileReference.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L240)

Extracted images as JPEG buffers (e.g., video frames, slide renders)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/fileReference.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L242)

Metadata about the extraction

---

### error?

> `optional` **error?**: `string`

Defined in: [types/fileReference.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L244)

Error message if extraction failed
