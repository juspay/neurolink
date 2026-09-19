[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompletionRequest

# Type Alias: OpenAICompletionRequest

> **OpenAICompletionRequest** = `object`

Defined in: [types/proxy.ts:3758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3758)

OpenAI Chat Completions request body.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3759)

---

### messages

> **messages**: [`OpenAIMessage`](OpenAIMessage.md)[]

Defined in: [types/proxy.ts:3760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3760)

---

### tools?

> `optional` **tools?**: [`OpenAIToolDef`](OpenAIToolDef.md)[]

Defined in: [types/proxy.ts:3761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3761)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAIToolChoice`](OpenAIToolChoice.md)

Defined in: [types/proxy.ts:3762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3762)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:3763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3763)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:3764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3764)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:3765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3765)

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/proxy.ts:3766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3766)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/proxy.ts:3767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3767)

---

### stop?

> `optional` **stop?**: `string` \| `string`[]

Defined in: [types/proxy.ts:3768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3768)

---

### n?

> `optional` **n?**: `number`

Defined in: [types/proxy.ts:3769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3769)

---

### response_format?

> `optional` **response_format?**: `object`

Defined in: [types/proxy.ts:3770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3770)

#### type

> **type**: `"text"` \| `"json_object"` \| `"json_schema"`

#### json_schema?

> `optional` **json_schema?**: `unknown`

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/proxy.ts:3774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3774)

#### include_usage?

> `optional` **include_usage?**: `boolean`
