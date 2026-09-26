[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDiscoveryResult

# Type Alias: ToolDiscoveryResult

> **ToolDiscoveryResult** = `object`

Tool discovery result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### success

> **success**: `boolean`

Whether discovery was successful

---

### toolCount

> **toolCount**: `number`

Number of tools discovered

---

### tools

> **tools**: [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)[]

Discovered tools

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### duration

> **duration**: `number`

Discovery duration in milliseconds

---

### serverId

> **serverId**: `string`

Server ID
