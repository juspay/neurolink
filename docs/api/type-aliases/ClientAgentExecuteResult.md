[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAgentExecuteResult

# Type Alias: ClientAgentExecuteResult

> **ClientAgentExecuteResult** = `object`

Agent execution result

## Properties

### content

> **content**: `string`

Response content

---

### agentId

> **agentId**: `string`

Agent ID

---

### sessionId

> **sessionId**: `string`

Session ID

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Tools used

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Tool executions

#### name

> **name**: `string`

#### input

> **input**: [`UnknownRecord`](UnknownRecord.md)

#### output

> **output**: `unknown`

#### duration

> **duration**: `number`

---

### usage?

> `optional` **usage?**: `object`

Token usage

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Response metadata
