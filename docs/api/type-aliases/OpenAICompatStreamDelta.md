[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatStreamDelta

# Type Alias: OpenAICompatStreamDelta

> **OpenAICompatStreamDelta** = `object`

## Properties

### role?

> `optional` **role?**: [`OpenAICompatChatRole`](OpenAICompatChatRole.md)

---

### content?

> `optional` **content?**: `string` \| `null`

---

### tool_calls?

> `optional` **tool_calls?**: `object`[]

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

---

### reasoning_content?

> `optional` **reasoning_content?**: `string` \| `null`

---

### reasoning?

> `optional` **reasoning?**: `string` \| `null`
