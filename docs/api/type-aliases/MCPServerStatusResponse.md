[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerStatusResponse

# Type Alias: MCPServerStatusResponse

> **MCPServerStatusResponse** = `object`

MCP server status response

## Properties

### serverId

> **serverId**: `string`

Server ID

---

### name

> **name**: `string`

Server name

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Connection status

---

### toolCount

> **toolCount**: `number`

Available tools count

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `string`

Last health check time

---

### error?

> `optional` **error?**: `string`

Error message if failed
