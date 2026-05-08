[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerConfig

# Type Alias: ExternalMCPServerConfig

> **ExternalMCPServerConfig** = `object`

Defined in: [types/externalMcp.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L20)

External MCP server configuration for process spawning

## Properties

### id

> **id**: `string`

Defined in: [types/externalMcp.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L22)

Unique identifier for the server

---

### command

> **command**: `string`

Defined in: [types/externalMcp.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L25)

Command to execute (e.g., 'npx', 'node', 'python')

---

### args

> **args**: `string`[]

Defined in: [types/externalMcp.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L28)

Arguments to pass to the command

---

### env?

> `optional` **env?**: `Record`\<`string`, `string`\>

Defined in: [types/externalMcp.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L31)

Environment variables for the process

---

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/externalMcp.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L34)

Transport protocol to use

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/externalMcp.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L37)

Connection timeout in milliseconds (default: 10000)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/externalMcp.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L40)

Maximum retry attempts for connection (default: 3)

---

### healthCheckInterval?

> `optional` **healthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L43)

Health check interval in milliseconds (default: 30000)

---

### autoRestart?

> `optional` **autoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L46)

Whether to automatically restart on failure (default: true)

---

### cwd?

> `optional` **cwd?**: `string`

Defined in: [types/externalMcp.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L49)

Working directory for the process

---

### url?

> `optional` **url?**: `string`

Defined in: [types/externalMcp.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L52)

URL for SSE/WebSocket/HTTP transports

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/externalMcp.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L55)

HTTP headers for authentication and configuration (HTTP/SSE/WebSocket)

---

### blockedTools?

> `optional` **blockedTools?**: `string`[]

Defined in: [types/externalMcp.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L58)

List of tool names to block/blacklist from this server

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/externalMcp.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L61)

Additional metadata
