[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3950)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3951)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3952)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3953)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3954)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3955)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3956)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3957)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3958)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3959)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3960)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3961)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3962)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

#### include_usage?

> `optional` **include_usage?**: `boolean`
