[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Defined in: [types/proxy.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L122)

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L123)

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

Defined in: [types/proxy.ts:124](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L124)

---

### max_tokens

> **max_tokens**: `number`

Defined in: [types/proxy.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L125)

---

### system?

> `optional` **system?**: `string` \| `object`[]

Defined in: [types/proxy.ts:126](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L126)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L127)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:128](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L128)

---

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/proxy.ts:129](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L129)

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

Defined in: [types/proxy.ts:130](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L130)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L131)

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

Defined in: [types/proxy.ts:132](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L132)

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"auto"` \| `"any"` \| `"none"`; \} \| \{ `type`: `"tool"`; `name`: `string`; \}

Defined in: [types/proxy.ts:133](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L133)

---

### thinking?

> `optional` **thinking?**: `object`

Defined in: [types/proxy.ts:136](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L136)

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:137](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L137)
