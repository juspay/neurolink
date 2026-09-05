[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3324)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3325)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3326)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3327)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3328)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3329)

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

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)
