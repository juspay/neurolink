[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3634)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3635)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3636)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3637)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3639)

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

Defined in: [types/proxy.ts:3653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3653)
