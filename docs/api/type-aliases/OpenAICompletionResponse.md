[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3882)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3883)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3884)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3886)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3887)

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

Defined in: [types/proxy.ts:3896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3896)
