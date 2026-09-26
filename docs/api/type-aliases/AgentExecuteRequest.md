[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteRequest

# Type Alias: AgentExecuteRequest

> **AgentExecuteRequest** = `object`

Agent execution request

## Properties

### input

> **input**: `string` \| \{ `text`: `string`; `images?`: `string`[]; `files?`: `string`[]; \}

Input prompt or message

---

### provider?

> `optional` **provider?**: `string`

Provider to use (optional)

---

### model?

> `optional` **model?**: `string`

Model to use (optional)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt (optional)

---

### temperature?

> `optional` **temperature?**: `number`

Temperature (0-1)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens

---

### tools?

> `optional` **tools?**: `string`[]

Tools to enable

---

### stream?

> `optional` **stream?**: `boolean`

Enable streaming

---

### sessionId?

> `optional` **sessionId?**: `string`

Session ID for conversation memory

---

### userId?

> `optional` **userId?**: `string`

User ID for context
