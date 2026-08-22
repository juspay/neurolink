[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatChatRequest

# Type Alias: OpenAICompatChatRequest

> **OpenAICompatChatRequest** = `object`

Defined in: [types/openaiCompatible.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L82)

## Properties

### model

> **model**: `string`

Defined in: [types/openaiCompatible.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L83)

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L84)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/openaiCompatible.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L85)

---

### stream_options?

> `optional` **stream_options?**: `object`

Defined in: [types/openaiCompatible.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L86)

#### include_usage?

> `optional` **include_usage?**: `boolean`

---

### max_tokens?

> `optional` **max_tokens?**: `number`

Defined in: [types/openaiCompatible.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L87)

---

### max_completion_tokens?

> `optional` **max_completion_tokens?**: `number`

Defined in: [types/openaiCompatible.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L88)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/openaiCompatible.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L89)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/openaiCompatible.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L90)

---

### presence_penalty?

> `optional` **presence_penalty?**: `number`

Defined in: [types/openaiCompatible.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L91)

---

### frequency_penalty?

> `optional` **frequency_penalty?**: `number`

Defined in: [types/openaiCompatible.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L92)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/openaiCompatible.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L93)

---

### stop?

> `optional` **stop?**: `string`[]

Defined in: [types/openaiCompatible.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L94)

---

### tools?

> `optional` **tools?**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[]

Defined in: [types/openaiCompatible.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L95)

---

### tool_choice?

> `optional` **tool_choice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

Defined in: [types/openaiCompatible.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L96)

---

### response_format?

> `optional` **response_format?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

Defined in: [types/openaiCompatible.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L97)

---

### parallel_tool_calls?

> `optional` **parallel_tool_calls?**: `boolean`

Defined in: [types/openaiCompatible.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L98)

---

### user?

> `optional` **user?**: `string`

Defined in: [types/openaiCompatible.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L99)
