[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3948)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3949)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3950)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3951)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3952)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3953)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3954)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3955)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3956)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3957)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3958)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3959)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3960)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3964)

#### include_usage?

> `optional` **include_usage?**: `boolean`
