[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:4001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4001)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:4002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4002)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:4003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4003)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:4004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4004)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:4006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4006)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:4007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4007)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:4008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4008)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:4009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4009)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:4010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4010)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:4012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4012)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

#### include_usage?

> `optional` **include_usage?**: `boolean`
