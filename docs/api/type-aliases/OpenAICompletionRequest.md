[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3260)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3261)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3262)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3263)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3264)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3265)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3270)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3271)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3275)

#### include_usage?

> `optional` **include_usage?**: `boolean`
