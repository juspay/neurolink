[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3648)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3649)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3650)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3651)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3652)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3653)

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

Defined in: [types/proxy.ts:3667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3667)
