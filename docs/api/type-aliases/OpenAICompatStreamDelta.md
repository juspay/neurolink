[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatStreamDelta

# Type Alias: OpenAICompatStreamDelta

> **OpenAICompatStreamDelta** = `object`

Defined in: [types/openaiCompatible.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L152)

## Properties

### role?

> `optional` **role?**: [`OpenAICompatChatRole`](OpenAICompatChatRole.md)

Defined in: [types/openaiCompatible.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L153)

---

### content?

> `optional` **content?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L154)

---

### tool_calls?

> `optional` **tool_calls?**: `object`[]

Defined in: [types/openaiCompatible.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L155)

#### index

> **index**: `number`

#### id?

> `optional` **id?**: `string`

#### type?

> `optional` **type?**: `"function"`

#### function?

> `optional` **function?**: `object`

##### function.name?

> `optional` **name?**: `string`

##### function.arguments?

> `optional` **arguments?**: `string`

---

### refusal?

> `optional` **refusal?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L164)

---

### reasoning_content?

> `optional` **reasoning_content?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L166)

---

### reasoning?

> `optional` **reasoning?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L167)
