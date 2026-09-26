[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:4037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4037)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:4038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4038)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:4040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4040)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:4041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4041)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:4042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4042)

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

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)
