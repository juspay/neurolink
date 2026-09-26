[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageQwenRawUsage

# Type Alias: LocalUsageQwenRawUsage

> **LocalUsageQwenRawUsage** = `object`

The `usageMetadata` object exactly as Qwen Code writes it into a transcript
line — Google GenAI's `usageMetadata` shape, camelCase, every field
optional because not every assistant record carries one. See
`qwenCodeReader.ts` for why `cachedContentTokenCount` is subtracted out of
`promptTokenCount` rather than added.

## Properties

### promptTokenCount?

> `optional` **promptTokenCount?**: `number`

---

### candidatesTokenCount?

> `optional` **candidatesTokenCount?**: `number`

---

### thoughtsTokenCount?

> `optional` **thoughtsTokenCount?**: `number`

---

### totalTokenCount?

> `optional` **totalTokenCount?**: `number`

---

### cachedContentTokenCount?

> `optional` **cachedContentTokenCount?**: `number`
