[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Defined in: [types/proxy.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L128)

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L129)

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

Defined in: [types/proxy.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L130)

---

### max_tokens

> **max_tokens**: `number`

Defined in: [types/proxy.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L131)

---

### system?

> `optional` **system?**: `string` \| `object`[]

Defined in: [types/proxy.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L132)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L133)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L134)

---

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/proxy.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L135)

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

Defined in: [types/proxy.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L136)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L137)

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

Defined in: [types/proxy.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L138)

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"auto"` \| `"any"` \| `"none"`; \} \| \{ `type`: `"tool"`; `name`: `string`; \}

Defined in: [types/proxy.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L139)

---

### thinking?

> `optional` **thinking?**: `object`

Defined in: [types/proxy.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L142)

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L143)
