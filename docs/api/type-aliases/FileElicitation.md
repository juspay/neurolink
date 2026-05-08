[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileElicitation

# Type Alias: FileElicitation

> **FileElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L177)

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
