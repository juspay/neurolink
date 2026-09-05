[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3307)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3308)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3309)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3310)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3311)

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

Defined in: [types/proxy.ts:3320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3320)
