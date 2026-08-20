[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3159)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3160)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3161)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3162)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3163)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3164)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3166)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3167)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3168)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3170)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

#### include_usage?

> `optional` **include_usage?**: `boolean`
