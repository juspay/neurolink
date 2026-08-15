[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AiSdkStreamChunk

# Type Alias: AiSdkStreamChunk

> **AiSdkStreamChunk** = `object`

Defined in: [types/client.ts:1617](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1617)

Internal stream chunk format used by the AI-SDK adapter's push/pull queue.
Distinct from the public NeuroLink `StreamChunk` (stream.ts) — this one
mirrors the underlying `ai` package event shape (text-delta / finish).

## Properties

### type

> **type**: `"text-delta"` \| `"finish"`

Defined in: [types/client.ts:1618](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1618)

---

### textDelta?

> `optional` **textDelta?**: `string`

Defined in: [types/client.ts:1619](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1619)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/client.ts:1620](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1620)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/client.ts:1621](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1621)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`
