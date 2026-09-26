[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAgentExecuteOptions

# Type Alias: ClientAgentExecuteOptions

> **ClientAgentExecuteOptions** = `object`

Agent execution options

## Properties

### agentId

> **agentId**: `string`

Agent ID

---

### input

> **input**: `string`

Input message

---

### sessionId?

> `optional` **sessionId?**: `string`

Session ID for conversation continuity

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

User context

---

### stream?

> `optional` **stream?**: `boolean`

Stream the response

---

### tools?

> `optional` **tools?**: `object`

Tool execution options

#### enabled?

> `optional` **enabled?**: `string`[]

Enabled tools

#### disabled?

> `optional` **disabled?**: `string`[]

Disabled tools

#### mode?

> `optional` **mode?**: `"auto"` \| `"manual"` \| `"confirm"`

Tool execution mode
