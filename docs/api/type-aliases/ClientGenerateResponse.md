[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientGenerateResponse

# Type Alias: ClientGenerateResponse

> **ClientGenerateResponse** = `object`

Defined in: [types/client.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L258)

Generate response (client-side version)

## Properties

### content

> **content**: `string`

Defined in: [types/client.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L260)

Generated content

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/client.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L262)

Provider used

---

### model?

> `optional` **model?**: `string`

Defined in: [types/client.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L264)

Model used

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/client.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L266)

Token usage

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/client.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L272)

Tool calls made

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/client.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L274)

Tool results

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/client.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L276)

Finish reason

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L278)

Response metadata
