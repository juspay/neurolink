[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3803)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3804)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3805)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3806)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3807)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3808)

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

Defined in: [types/proxy.ts:3822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3822)
