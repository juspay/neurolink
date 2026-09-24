[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3878)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3879)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3880)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3881)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3882)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3883)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3884)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3886)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3887)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3888)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3889)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3890)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3894)

#### include_usage?

> `optional` **include_usage?**: `boolean`
