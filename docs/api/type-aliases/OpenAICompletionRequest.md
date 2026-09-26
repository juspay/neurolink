[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:4010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4010)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:4012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4012)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:4014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4014)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:4015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4015)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:4017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4017)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:4018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4018)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:4019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4019)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:4020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4020)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:4021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4021)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:4022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4022)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:4026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4026)

#### include_usage?

> `optional` **include_usage?**: `boolean`
