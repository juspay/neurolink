[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3673)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3674)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3675)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3676)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3677)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3678)

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

Defined in: [types/proxy.ts:3692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3692)
