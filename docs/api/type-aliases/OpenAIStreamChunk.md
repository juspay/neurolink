[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:4045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4045)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:4046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4046)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:4047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4047)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:4048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4048)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:4049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4049)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:4050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4050)

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

Defined in: [types/proxy.ts:4064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4064)
