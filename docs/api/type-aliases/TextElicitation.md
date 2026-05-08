[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextElicitation

# Type Alias: TextElicitation

> **TextElicitation** = [`ElicitationRequest`](ElicitationRequest.md) & `object`

Defined in: [types/elicitation.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L93)

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
