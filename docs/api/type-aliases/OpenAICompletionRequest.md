[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3148](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3148)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3149](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3149)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3150)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3151](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3151)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3152](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3152)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3153](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3153)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3154](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3154)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3155](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3155)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3156](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3156)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3157)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3158)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3159)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3160](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3160)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3164)

#### include_usage?

> `optional` **include_usage?**: `boolean`
