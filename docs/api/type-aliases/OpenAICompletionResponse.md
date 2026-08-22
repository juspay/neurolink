[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3175)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3176)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3177)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3178)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3179)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3180)

#### index

> **index**: `number`

#### message

> **message**: `object`

##### message.role

> **role**: `"assistant"`

##### message.content

> **content**: `string` \| `null`

##### message.tool_calls?

> `optional` **tool_calls?**: [`OpenAIToolCall`](OpenAIToolCall.md)[]

#### finish_reason

> **finish_reason**: `"stop"` \| `"tool_calls"` \| `"length"` \| `"content_filter"` \| `null`

---

### usage

> **usage**: [`OpenAIUsage`](OpenAIUsage.md)

Defined in: [types/proxy.ts:3189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3189)
