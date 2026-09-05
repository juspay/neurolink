[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3279)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3280)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3281)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3282)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3283)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3284)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3285)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3286)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3287)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3288)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3289)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3290)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3291)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3295)

#### include_usage?

> `optional` **include_usage?**: `boolean`
