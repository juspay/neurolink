[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageQwenRawUsage

# Type Alias: LocalUsageQwenRawUsage

> **LocalUsageQwenRawUsage** = `object`

Defined in: [types/localUsage.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L213)

The `usageMetadata` object exactly as Qwen Code writes it into a transcript
line — Google GenAI's `usageMetadata` shape, camelCase, every field
optional because not every assistant record carries one. See
`qwenCodeReader.ts` for why `cachedContentTokenCount` is subtracted out of
`promptTokenCount` rather than added.

## Properties

### promptTokenCount?

> `optional` **promptTokenCount?**: `number`

Defined in: [types/localUsage.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L214)

---

### candidatesTokenCount?

> `optional` **candidatesTokenCount?**: `number`

Defined in: [types/localUsage.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L215)

---

### thoughtsTokenCount?

> `optional` **thoughtsTokenCount?**: `number`

Defined in: [types/localUsage.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L216)

---

### totalTokenCount?

> `optional` **totalTokenCount?**: `number`

Defined in: [types/localUsage.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L217)

---

### cachedContentTokenCount?

> `optional` **cachedContentTokenCount?**: `number`

Defined in: [types/localUsage.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L218)
