[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3902)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3903)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3904)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3905)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3906)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3907)

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

Defined in: [types/proxy.ts:3916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3916)
