[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3616)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3617)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3618)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3619)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3620)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3621)

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

Defined in: [types/proxy.ts:3630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3630)
