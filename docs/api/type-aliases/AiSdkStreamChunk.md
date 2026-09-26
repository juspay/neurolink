[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AiSdkStreamChunk

# Type Alias: AiSdkStreamChunk

> **AiSdkStreamChunk** = `object`

Internal stream chunk format used by the AI-SDK adapter's push/pull queue.
Distinct from the public NeuroLink `StreamChunk` (stream.ts) — this one
mirrors the underlying `ai` package event shape (text-delta / finish).

## Properties

### type

> **type**: `"text-delta"` \| `"finish"`

---

### textDelta?

> `optional` **textDelta?**: `string`

---

### finishReason?

> `optional` **finishReason?**: `string`

---

### usage?

> `optional` **usage?**: `object`

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`
