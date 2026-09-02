[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3304)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3305)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3307)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3308)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3309)

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

Defined in: [types/proxy.ts:3323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3323)
