[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerConfig

# Type Alias: ExternalMCPServerConfig

> **ExternalMCPServerConfig** = `object`

Defined in: [types/externalMcp.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L24)

External MCP server configuration for process spawning

## Properties

### id

> **id**: `string`

Defined in: [types/externalMcp.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L26)

Unique identifier for the server

---

### command

> **command**: `string`

Defined in: [types/externalMcp.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L29)

Command to execute (e.g., 'npx', 'node', 'python')

---

### args

> **args**: `string`[]

Defined in: [types/externalMcp.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L32)

Arguments to pass to the command

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Defined in: [types/externalMcp.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L35)

Environment variables for the process

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/externalMcp.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L38)

Transport protocol to use

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/externalMcp.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L41)

Connection timeout in milliseconds (default: 10000)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/externalMcp.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L44)

Maximum retry attempts for connection (default: 3)

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L47)

Health check interval in milliseconds (default: 30000)

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L50)

Whether to automatically restart on failure (default: true)

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/externalMcp.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L53)

Working directory for the process

---

### url?

> `optional` **url?**: `string`

Defined in: [types/externalMcp.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L56)

URL for SSE/WebSocket/HTTP transports

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/externalMcp.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L59)

HTTP headers for authentication and configuration (HTTP/SSE/WebSocket)

---

### blockedTools?

> `optional` **blockedTools?**: `string`[]

Defined in: [types/externalMcp.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L62)

List of tool names to block/blacklist from this server

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L65)

Additional metadata
