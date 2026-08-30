[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageQwenRawUsage

# Type Alias: LocalUsageQwenRawUsage

> **LocalUsageQwenRawUsage** = `object`

Defined in: [types/localUsage.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L282)

The `usageMetadata` object exactly as Qwen Code writes it into a transcript
line — Google GenAI's `usageMetadata` shape, camelCase, every field
optional because not every assistant record carries one. See
`qwenCodeReader.ts` for why `cachedContentTokenCount` is subtracted out of
`promptTokenCount` rather than added.

## Properties

### promptTokenCount?

> `optional` **promptTokenCount?**: `number`

Defined in: [types/localUsage.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L283)

---

### candidatesTokenCount?

> `optional` **candidatesTokenCount?**: `number`

Defined in: [types/localUsage.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L284)

---

### thoughtsTokenCount?

> `optional` **thoughtsTokenCount?**: `number`

Defined in: [types/localUsage.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L285)

---

### totalTokenCount?

> `optional` **totalTokenCount?**: `number`

Defined in: [types/localUsage.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L286)

---

### cachedContentTokenCount?

> `optional` **cachedContentTokenCount?**: `number`

Defined in: [types/localUsage.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L287)
