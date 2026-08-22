[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileElicitation

# Type Alias: FileElicitation

> **FileElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/elicitation.ts#L177)

File elicitation

## Type Declaration

### type

> **type**: `"file"`

### accept?

> `optional` **accept?**: `string`[]

Accepted file types (MIME types or extensions)

### multiple?

> `optional` **multiple?**: `boolean`

Allow multiple files

### maxSize?

> `optional` **maxSize?**: `number`

Maximum file size in bytes
