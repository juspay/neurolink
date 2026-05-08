[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteRequest

# Type Alias: AgentExecuteRequest

> **AgentExecuteRequest** = `object`

Defined in: [types/server.ts:551](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L551)

Agent execution request

## Properties

### input

> **input**: `string` \| \{ `text`: `string`; `images?`: `string`[]; `files?`: `string`[]; \}

Defined in: [types/server.ts:553](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L553)

Input prompt or message

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/server.ts:556](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L556)

Provider to use (optional)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/server.ts:559](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L559)

Model to use (optional)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/server.ts:562](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L562)

System prompt (optional)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/server.ts:565](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L565)

Temperature (0-1)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/server.ts:568](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L568)

Maximum tokens

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/server.ts:571](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L571)

Tools to enable

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/server.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L574)

Enable streaming

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/server.ts:577](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L577)

Session ID for conversation memory

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/server.ts:580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L580)

User ID for context
