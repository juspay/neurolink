[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3286)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3287)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3288)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3289)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3290)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3291)

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

Defined in: [types/proxy.ts:3300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3300)
