[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamResult

# Type Alias: ClientStreamResult

> **ClientStreamResult** = `object`

Defined in: [types/client.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L204)

Stream result with full response data

## Properties

### content

> **content**: `string`

Defined in: [types/client.ts:206](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L206)

Full accumulated text content

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/client.ts:208](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L208)

All tool calls made

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/client.ts:210](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L210)

All tool results

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/client.ts:212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L212)

Token usage information

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/client.ts:218](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L218)

Finish reason

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:220](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L220)

Response metadata
