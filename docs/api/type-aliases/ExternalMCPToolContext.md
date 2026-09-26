[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPToolContext

# Type Alias: ExternalMCPToolContext

> **ExternalMCPToolContext** = `object`

External MCP tool execution context

## Properties

### sessionId

> **sessionId**: `string`

Execution session ID

---

### userId?

> `optional` **userId?**: `string`

User ID if available

---

### serverId

> **serverId**: `string`

Server ID executing the tool

---

### toolName

> **toolName**: `string`

Tool name being executed

---

### timeout?

> `optional` **timeout?**: `number`

Execution timeout in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional context data
