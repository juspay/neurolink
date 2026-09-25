[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3975)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3976)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3977)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3978)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3979)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3980)

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

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)
