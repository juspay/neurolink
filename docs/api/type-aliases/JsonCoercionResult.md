[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JsonCoercionResult

# Type Alias: JsonCoercionResult

> **JsonCoercionResult** = `object`

Defined in: [types/utilities.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L340)

Result of coercing arbitrary model text into canonical, valid JSON.
`content` is a JSON.stringify of the recovered object; `structuredData` is
the parsed object itself.

## Properties

### content

> **content**: `string`

Defined in: [types/utilities.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L341)

---

### structuredData

> **structuredData**: `unknown`

Defined in: [types/utilities.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L342)

---

### repaired

> **repaired**: `boolean`

Defined in: [types/utilities.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L344)

True when jsonrepair altered the model text to make it parse.

---

### truncated

> **truncated**: `boolean`

Defined in: [types/utilities.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L349)

True when the recovered object came from a truncated (unclosed) span —
the response likely hit the output-token cap and data may be incomplete.
