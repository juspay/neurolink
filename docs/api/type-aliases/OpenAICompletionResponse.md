[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3257)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3258)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3260)

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

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)
