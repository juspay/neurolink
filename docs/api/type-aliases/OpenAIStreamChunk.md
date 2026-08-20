[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3204)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3205)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3206)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3207)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

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

Defined in: [types/proxy.ts:3222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3222)
