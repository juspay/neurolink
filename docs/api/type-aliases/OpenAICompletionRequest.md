[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3603)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3604)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3605)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3606)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3607)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3608)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3609)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3610)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3611)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3612)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3613)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3614)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3615)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3619)

#### include_usage?

> `optional` **include_usage?**: `boolean`
