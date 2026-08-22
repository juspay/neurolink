[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3193)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3194)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3195)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3196)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3197)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3198)

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

Defined in: [types/proxy.ts:3212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3212)
