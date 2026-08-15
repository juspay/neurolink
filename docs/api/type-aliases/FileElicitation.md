[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileElicitation

# Type Alias: FileElicitation

> **FileElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:177](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/elicitation.ts#L177)

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
