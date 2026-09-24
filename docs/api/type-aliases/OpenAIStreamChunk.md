[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3923)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3924)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3925)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3926)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3927)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3928)

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

Defined in: [types/proxy.ts:3942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3942)
