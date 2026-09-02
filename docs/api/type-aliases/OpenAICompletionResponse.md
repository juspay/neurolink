[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3277)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3278)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3279)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3280)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3281)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3282)

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

Defined in: [types/proxy.ts:3291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3291)
