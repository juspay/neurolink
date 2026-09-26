[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3998)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3999)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

#### index

> **index**: `number`

#### delta

> **delta**: `object`

##### delta.role?

> `optional` **role?**: `"assistant"`

##### delta.content?

> `optional` **content?**: `string`

##### delta.tool_calls?

> `optional` **tool_calls?**: `object`[]

#### finish_reason

> **finish_reason**: `string` \| `null`

---

### usage?

> `optional` **usage?**: [`OpenAIUsage`](OpenAIUsage.md)

Defined in: [types/proxy.ts:4014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4014)
