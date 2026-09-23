[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAIStreamChunk

# Type Alias: OpenAIStreamChunk

> **OpenAIStreamChunk** = `object`

Defined in: [types/proxy.ts:3900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3900)

OpenAI streaming chunk.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:3901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3901)

---

### object

> **object**: `"chat.completion.chunk"`

Defined in: [types/proxy.ts:3902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3902)

---

### created

> **created**: `number`

Defined in: [types/proxy.ts:3903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3903)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3904)

---

### choices

> **choices**: `object`[]

Defined in: [types/proxy.ts:3905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3905)

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

Defined in: [types/proxy.ts:3919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3919)
