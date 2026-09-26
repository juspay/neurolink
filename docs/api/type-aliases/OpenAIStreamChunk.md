[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:4055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4055)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:4056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4056)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:4057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4057)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:4058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4058)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:4059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4059)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:4060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4060)

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

Defined in: [types/proxy.ts:4074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4074)
