[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3905)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3906)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3907)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3908)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3909)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3910)

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

Defined in: [types/proxy.ts:3919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3919)
