[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3270)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3271)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3272)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3273)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3274)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3275)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3276)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3277)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3278)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3282)

#### include_usage?

> `optional` **include_usage?**: `boolean`
