[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Defined in: [types/proxy.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L134)

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L135)

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

Defined in: [types/proxy.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L136)

---

### max_tokens

> **max_tokens**: `number`

Defined in: [types/proxy.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L137)

---

### system?

> `optional` **system?**: `string` \| `object`[]

Defined in: [types/proxy.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L138)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L139)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L140)

---

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/proxy.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L141)

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

Defined in: [types/proxy.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L142)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L143)

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

Defined in: [types/proxy.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L144)

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"auto"` \| `"any"` \| `"none"`; \} \| \{ `type`: `"tool"`; `name`: `string`; \}

Defined in: [types/proxy.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L145)

---

### thinking?

> `optional` **thinking?**: `object`

Defined in: [types/proxy.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L148)

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L149)
