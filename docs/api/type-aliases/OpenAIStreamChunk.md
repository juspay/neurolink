[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3273)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3274)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3275)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3276)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3277)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3278)

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

Defined in: [types/proxy.ts:3292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3292)
