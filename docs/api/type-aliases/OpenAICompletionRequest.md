[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3855)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3856)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3857)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3858)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3859)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3860)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3861)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3862)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3863)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3864)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3865)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3866)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3867)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3871)

#### include_usage?

> `optional` **include_usage?**: `boolean`
