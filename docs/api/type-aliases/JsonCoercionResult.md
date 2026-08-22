[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JsonCoercionResult

# Type Alias: JsonCoercionResult

> **JsonCoercionResult** = `object`

Defined in: [types/utilities.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L326)

Result of coercing arbitrary model text into canonical, valid JSON.
`content` is a JSON.stringify of the recovered object; `structuredData` is
the parsed object itself.

## Properties

### content

> **content**: `string`

Defined in: [types/utilities.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L327)

---

### structuredData

> **structuredData**: `unknown`

Defined in: [types/utilities.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L328)

---

### repaired

> **repaired**: `boolean`

Defined in: [types/utilities.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L330)

True when jsonrepair altered the model text to make it parse.

---

### truncated

> **truncated**: `boolean`

Defined in: [types/utilities.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L335)

True when the recovered object came from a truncated (unclosed) span —
the response likely hit the output-token cap and data may be incomplete.
