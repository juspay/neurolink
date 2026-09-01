[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerInstance

# Type Alias: ExternalMCPServerInstance

> **ExternalMCPServerInstance** = `object`

Defined in: [types/externalMcp.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L71)

Runtime state of an external MCP server instance

## Properties

### config

> **config**: [`ExternalMCPServerConfig`](ExternalMCPServerConfig.md)

Defined in: [types/externalMcp.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L73)

Server configuration

---

### process

> **process**: `ChildProcess` \| `null`

Defined in: [types/externalMcp.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L79)

Child process handle. Always null for stdio servers: the SDK transport
owns the process and does not expose the handle. Use `pid`.

---

### pid?

> `optional` **pid?**: `number`

Defined in: [types/externalMcp.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L82)

OS process id of the stdio server, once connected

---

### client

> **client**: `Client` \| `null`

Defined in: [types/externalMcp.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L85)

MCP client instance

---

### transport

> **transport**: `Transport` \| `null`

Defined in: [types/externalMcp.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L88)

Transport instance

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L91)

Current server status

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/externalMcp.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L94)

Last error message if any

---

### startTime?

> `optional` **startTime?**: `Date`

Defined in: [types/externalMcp.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L97)

When the server was started

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `Date`

Defined in: [types/externalMcp.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L100)

When the server was last seen healthy

---

### reconnectAttempts

> **reconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L103)

Number of reconnection attempts

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L106)

Maximum reconnection attempts before giving up

---

### tools

> **tools**: `Map`\<`string`, [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)\>

Defined in: [types/externalMcp.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L109)

Available tools from this server

---

### toolsArray?

> `optional` **toolsArray?**: `object`[]

Defined in: [types/externalMcp.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L112)

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

Defined in: [types/externalMcp.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L119)

Server capabilities reported by MCP

---

### healthTimer?

> `optional` **healthTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L122)

Health monitoring timer

---

### restartTimer?

> `optional` **restartTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L125)

Restart backoff timer

---

### metrics

> **metrics**: `object`

Defined in: [types/externalMcp.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L128)

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
