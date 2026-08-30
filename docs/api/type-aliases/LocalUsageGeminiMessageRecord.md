[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiMessageRecord

# Type Alias: LocalUsageGeminiMessageRecord

> **LocalUsageGeminiMessageRecord** = `object`

Defined in: [types/localUsage.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L311)

A `type: "gemini"` message record as read out of a chat transcript line —
whether it arrived bare-appended or unwrapped from a `$set.messages[]`
bootstrap entry. See `geminiCliReader.ts` for both shapes.

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/localUsage.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L312)

---

### type?

> `optional` **type?**: `string`

Defined in: [types/localUsage.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L313)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/localUsage.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L314)

---

### tokens?

> `optional` **tokens?**: [`LocalUsageGeminiCliTokens`](LocalUsageGeminiCliTokens.md)

Defined in: [types/localUsage.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L315)
