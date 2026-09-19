[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3785)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3786)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3787)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3788)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3789)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3790)

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

Defined in: [types/proxy.ts:3799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3799)
