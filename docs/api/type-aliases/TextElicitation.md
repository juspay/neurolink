[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextElicitation

# Type Alias: TextElicitation

> **TextElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:93](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/elicitation.ts#L93)

Text input elicitation

## Type Declaration

### type

> **type**: `"text"`

### placeholder?

> `optional` **placeholder?**: `string`

Input placeholder

### minLength?

> `optional` **minLength?**: `number`

Minimum length

### maxLength?

> `optional` **maxLength?**: `number`

Maximum length

### pattern?

> `optional` **pattern?**: `string`

Validation regex pattern

### multiline?

> `optional` **multiline?**: `boolean`

Whether to allow multiline input
