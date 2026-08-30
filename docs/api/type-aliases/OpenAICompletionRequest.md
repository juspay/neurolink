[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3228)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3229)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3230)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3231)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3232)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3233)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3234)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3235)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3236)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3237)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3238)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3239)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3240)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3244)

#### include_usage?

> `optional` **include_usage?**: `boolean`
