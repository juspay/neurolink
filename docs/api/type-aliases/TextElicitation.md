[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextElicitation

# Type Alias: TextElicitation

> **TextElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:93](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/elicitation.ts#L93)

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
