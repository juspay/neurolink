[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3630)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3631)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3632)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3633)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3634)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3635)

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

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)
