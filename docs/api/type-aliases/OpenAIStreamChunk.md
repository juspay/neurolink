[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3295)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3296)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3297)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3298)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3299)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3300)

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

Defined in: [types/proxy.ts:3314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3314)
