[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiMessageRecord

# Type Alias: LocalUsageGeminiMessageRecord

> **LocalUsageGeminiMessageRecord** = `object`

Defined in: [types/localUsage.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L242)

A `type: "gemini"` message record as read out of a chat transcript line —
whether it arrived bare-appended or unwrapped from a `$set.messages[]`
bootstrap entry. See `geminiCliReader.ts` for both shapes.

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/localUsage.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L243)

---

### type?

> `optional` **type?**: `string`

Defined in: [types/localUsage.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L244)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/localUsage.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L245)

---

### tokens?

> `optional` **tokens?**: [`LocalUsageGeminiCliTokens`](LocalUsageGeminiCliTokens.md)

Defined in: [types/localUsage.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L246)
