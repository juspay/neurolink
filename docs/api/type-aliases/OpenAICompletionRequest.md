[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3250)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3251)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3252)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3253)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3254)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3255)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3256)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3257)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3258)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3260)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3261)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3262)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

#### include_usage?

> `optional` **include_usage?**: `boolean`
