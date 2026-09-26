[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3977)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3978)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3979)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3980)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3981)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3982)

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

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)
