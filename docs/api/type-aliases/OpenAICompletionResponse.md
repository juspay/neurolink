[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionResponse

# Type Alias: OpenAICompletionResponse

> **OpenAICompletionResponse** = `object`

Defined in: [types/proxy.ts:3292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3292)

OpenAI non-streaming response.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3293)

---

### object

> **object**: `"chat.completion"`

Defined in: [types/proxy.ts:3294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3294)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3295)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3296)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3297)

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

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)
