[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatStreamDelta

# Type Alias: OpenAICompatStreamDelta

> **OpenAICompatStreamDelta** = `object`

Defined in: [types/openaiCompatible.ts:149](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L149)

## Properties

### role?

> `optional` **role?**: [`OpenAICompatChatRole`](OpenAICompatChatRole.md)

Defined in: [types/openaiCompatible.ts:150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L150)

---

### content?

> `optional` **content?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:151](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L151)

---

### tool_calls?

> `optional` **tool_calls?**: `object`[]

Defined in: [types/openaiCompatible.ts:152](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L152)

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

Defined in: [types/openaiCompatible.ts:161](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L161)

---

### reasoning_content?

> `optional` **reasoning_content?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:163](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L163)

---

### reasoning?

> `optional` **reasoning?**: `string` \| `null`

Defined in: [types/openaiCompatible.ts:164](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L164)
