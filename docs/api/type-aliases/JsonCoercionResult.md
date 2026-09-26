[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JsonCoercionResult

# Type Alias: JsonCoercionResult

> **JsonCoercionResult** = `object`

Result of coercing arbitrary model text into canonical, valid JSON.
`content` is a JSON.stringify of the recovered object; `structuredData` is
the parsed object itself.

## Properties

### content

> **content**: `string`

---

### structuredData

> **structuredData**: `unknown`

---

### repaired

> **repaired**: `boolean`

True when jsonrepair altered the model text to make it parse.

---

### truncated

> **truncated**: `boolean`

True when the recovered object came from a truncated (unclosed) span —
the response likely hit the output-token cap and data may be incomplete.
