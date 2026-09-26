[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerConfig

# Type Alias: ExternalMCPServerConfig

> **ExternalMCPServerConfig** = `object`

External MCP server configuration for process spawning

## Properties

### id

> **id**: `string`

Unique identifier for the server

---

### command

> **command**: `string`

Command to execute (e.g., 'npx', 'node', 'python')

---

### args

> **args**: `string`[]

Arguments to pass to the command

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Environment variables for the process

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

Transport protocol to use

---

### timeout?

> `optional` **timeout?**: `number`

Connection timeout in milliseconds (default: 10000)

---

### retries?

> `optional` **retries?**: `number`

Maximum retry attempts for connection (default: 3)

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Health check interval in milliseconds (default: 30000)

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

Whether to automatically restart on failure (default: true)

---

### cwd?

> `optional` **cwd?**: `string`

Working directory for the process

---

### url?

> `optional` **url?**: `string`

URL for SSE/WebSocket/HTTP transports

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

HTTP headers for authentication and configuration (HTTP/SSE/WebSocket)

---

### blockedTools?

> `optional` **blockedTools?**: `string`[]

List of tool names to block/blacklist from this server

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional metadata
