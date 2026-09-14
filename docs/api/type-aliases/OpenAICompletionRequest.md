[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3589)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3590)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3591)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3592)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3593)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3594)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3595)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3596)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3597)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3598)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3599)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3600)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3601)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3605)

#### include_usage?

> `optional` **include_usage?**: `boolean`
