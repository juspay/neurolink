[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3311)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3312)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3313)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3314)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3315)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3316)

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

Defined in: [types/proxy.ts:3330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3330)
