[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3185)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3187)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3188)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3189)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3190)

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

Defined in: [types/proxy.ts:3199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3199)
