[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerInstance

# Type Alias: ExternalMCPServerInstance

> **ExternalMCPServerInstance** = `object`

Runtime state of an external MCP server instance

## Properties

### config

> **config**: [`ExternalMCPServerConfig`](ExternalMCPServerConfig.md)

Server configuration

---

### process

> **process**: `ChildProcess` \| `null`

Child process handle. Always null for stdio servers: the SDK transport
owns the process and does not expose the handle. Use `pid`.

---

### pid?

> `optional` **pid?**: `number`

OS process id of the stdio server, once connected

---

### client

> **client**: `Client` \| `null`

MCP client instance

---

### transport

> **transport**: `Transport` \| `null`

Transport instance

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Current server status

---

### lastError?

> `optional` **lastError?**: `string`

Last error message if any

---

### startTime?

> `optional` **startTime?**: `Date`

When the server was started

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `Date`

When the server was last seen healthy

---

### reconnectAttempts

> **reconnectAttempts**: `number`

Number of reconnection attempts

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Maximum reconnection attempts before giving up

---

### tools

> **tools**: `Map`\<`string`, [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)\>

Available tools from this server

---

### toolsArray?

> `optional` **toolsArray?**: `object`[]

Cached tools array for ZERO conversion - MCP format

#### name

> **name**: `string`

#### description

> **description**: `string`

#### inputSchema?

> `optional` **inputSchema?**: `object`

---

### capabilities?

> `optional` **capabilities?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Server capabilities reported by MCP

---

### healthTimer?

> `optional` **healthTimer?**: `NodeJS.Timeout`

Health monitoring timer

---

### restartTimer?

> `optional` **restartTimer?**: `NodeJS.Timeout`

Restart backoff timer

---

### metrics

> **metrics**: `object`

Performance metrics

#### totalConnections

> **totalConnections**: `number`

#### totalDisconnections

> **totalDisconnections**: `number`

#### totalErrors

> **totalErrors**: `number`

#### totalToolCalls

> **totalToolCalls**: `number`

#### averageResponseTime

> **averageResponseTime**: `number`

#### lastResponseTime

> **lastResponseTime**: `number`
