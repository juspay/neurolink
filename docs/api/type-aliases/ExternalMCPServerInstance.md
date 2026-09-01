[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerInstance

# Type Alias: ExternalMCPServerInstance

> **ExternalMCPServerInstance** = `object`

Defined in: [types/externalMcp.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L67)

Runtime state of an external MCP server instance

## Properties

### config

> **config**: [`ExternalMCPServerConfig`](ExternalMCPServerConfig.md)

Defined in: [types/externalMcp.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L69)

Server configuration

---

### process

> **process**: `ChildProcess` \| `null`

Defined in: [types/externalMcp.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L75)

Child process handle. Always null for stdio servers: the SDK transport
owns the process and does not expose the handle. Use `pid`.

---

### pid?

> `optional` **pid?**: `number`

Defined in: [types/externalMcp.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L78)

OS process id of the stdio server, once connected

---

### client

> **client**: `Client` \| `null`

Defined in: [types/externalMcp.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L81)

MCP client instance

---

### transport

> **transport**: `Transport` \| `null`

Defined in: [types/externalMcp.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L84)

Transport instance

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L87)

Current server status

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/externalMcp.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L90)

Last error message if any

---

### startTime?

> `optional` **startTime?**: `Date`

Defined in: [types/externalMcp.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L93)

When the server was started

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `Date`

Defined in: [types/externalMcp.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L96)

When the server was last seen healthy

---

### reconnectAttempts

> **reconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L99)

Number of reconnection attempts

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L102)

Maximum reconnection attempts before giving up

---

### tools

> **tools**: `Map`\<`string`, [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)\>

Defined in: [types/externalMcp.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L105)

Available tools from this server

---

### toolsArray?

> `optional` **toolsArray?**: `object`[]

Defined in: [types/externalMcp.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L108)

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

Defined in: [types/externalMcp.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L115)

Server capabilities reported by MCP

---

### healthTimer?

> `optional` **healthTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L118)

Health monitoring timer

---

### restartTimer?

> `optional` **restartTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L121)

Restart backoff timer

---

### metrics

> **metrics**: `object`

Defined in: [types/externalMcp.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L124)

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
