[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeRequest

# Type Alias: ClaudeRequest

> **ClaudeRequest** = `object`

Defined in: [types/proxy.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L110)

Inbound Claude Messages API request body.
Matches POST /v1/messages.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L111)

---

### messages

> **messages**: [`ClaudeMessage`](ClaudeMessage.md)[]

Defined in: [types/proxy.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L112)

---

### max_tokens

> **max_tokens**: `number`

Defined in: [types/proxy.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L113)

---

### system?

> `optional` **system?**: `string` \| `object`[]

Defined in: [types/proxy.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L114)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/proxy.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L115)

---

### top_p?

> `optional` **top_p?**: `number`

Defined in: [types/proxy.ts:116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L116)

---

### top_k?

> `optional` **top_k?**: `number`

Defined in: [types/proxy.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L117)

---

### stop_sequences?

> `optional` **stop_sequences?**: `string`[]

Defined in: [types/proxy.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L118)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L119)

---

### tools?

> `optional` **tools?**: [`ClaudeTool`](ClaudeTool.md)[]

Defined in: [types/proxy.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L120)

---

### tool_choice?

> `optional` **tool_choice?**: \{ `type`: `"auto"` \| `"any"` \| `"none"`; \} \| \{ `type`: `"tool"`; `name`: `string`; \}

Defined in: [types/proxy.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L121)

---

### thinking?

> `optional` **thinking?**: `object`

Defined in: [types/proxy.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L124)

#### type

> **type**: `string`

#### budget_tokens?

> `optional` **budget_tokens?**: `number`

---

### metadata?

> `optional` **metadata?**: [`ClaudeMetadata`](ClaudeMetadata.md)

Defined in: [types/proxy.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L125)
