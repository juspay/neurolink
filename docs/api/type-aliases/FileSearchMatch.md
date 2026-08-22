[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSearchMatch

# Type Alias: FileSearchMatch

> **FileSearchMatch** = `object`

Defined in: [types/fileReference.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L164)

A single search match within a file

## Properties

### lineNumber

> **lineNumber**: `number`

Defined in: [types/fileReference.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L166)

Line number (1-indexed)

---

### line

> **line**: `string`

Defined in: [types/fileReference.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L168)

The matching line content

---

### contextBefore

> **contextBefore**: `string`[]

Defined in: [types/fileReference.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L170)

Context lines before the match

---

### contextAfter

> **contextAfter**: `string`[]

Defined in: [types/fileReference.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/fileReference.ts#L172)

Context lines after the match
