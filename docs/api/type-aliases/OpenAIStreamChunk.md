[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3652)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3653)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3654)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3655)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3656)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3657)

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

Defined in: [types/proxy.ts:3671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3671)
