[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiMessageRecord

# Type Alias: LocalUsageGeminiMessageRecord

> **LocalUsageGeminiMessageRecord** = `object`

A `type: "gemini"` message record as read out of a chat transcript line —
whether it arrived bare-appended or unwrapped from a `$set.messages[]`
bootstrap entry. See `geminiCliReader.ts` for both shapes.

## Properties

### id?

> `optional` **id?**: `string`

---

### type?

> `optional` **type?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### tokens?

> `optional` **tokens?**: [`LocalUsageGeminiCliTokens`](LocalUsageGeminiCliTokens.md)
