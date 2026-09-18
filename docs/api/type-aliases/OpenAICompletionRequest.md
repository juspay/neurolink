[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3628)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3629)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3630)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3631)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3632)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3633)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3634)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3635)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3636)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3637)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3639)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3640)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)

#### include_usage?

> `optional` **include_usage?**: `boolean`
