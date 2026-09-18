[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3655)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3656)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3657)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3658)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3659)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3660)

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

Defined in: [types/proxy.ts:3669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3669)
