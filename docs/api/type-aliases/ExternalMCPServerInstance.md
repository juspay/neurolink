[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerInstance

# Type Alias: ExternalMCPServerInstance

> **ExternalMCPServerInstance** = `object`

Defined in: [types/externalMcp.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L67)

Runtime state of an external MCP server instance

## Properties

### config

> **config**: [`ExternalMCPServerConfig`](ExternalMCPServerConfig.md)

Defined in: [types/externalMcp.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L69)

Server configuration

---

### process

> **process**: `ChildProcess` \| `null`

Defined in: [types/externalMcp.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L72)

Child process (for stdio transport)

---

### client

> **client**: `Client` \| `null`

Defined in: [types/externalMcp.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L75)

MCP client instance

---

### transport

> **transport**: `Transport` \| `null`

Defined in: [types/externalMcp.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L78)

Transport instance

---

### status

> **status**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

Defined in: [types/externalMcp.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L81)

Current server status

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/externalMcp.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L84)

Last error message if any

---

### startTime?

> `optional` **startTime?**: `Date`

Defined in: [types/externalMcp.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L87)

When the server was started

---

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `Date`

Defined in: [types/externalMcp.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L90)

When the server was last seen healthy

---

### reconnectAttempts

> **reconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L93)

Number of reconnection attempts

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Defined in: [types/externalMcp.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L96)

Maximum reconnection attempts before giving up

---

### tools

> **tools**: `Map`\<`string`, [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)\>

Defined in: [types/externalMcp.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L99)

Available tools from this server

---

### toolsArray?

> `optional` **toolsArray?**: `object`[]

Defined in: [types/externalMcp.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L102)

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

Defined in: [types/externalMcp.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L109)

Server capabilities reported by MCP

---

### healthTimer?

> `optional` **healthTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L112)

Health monitoring timer

---

### restartTimer?

> `optional` **restartTimer?**: `NodeJS.Timeout`

Defined in: [types/externalMcp.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L115)

Restart backoff timer

---

### metrics

> **metrics**: `object`

Defined in: [types/externalMcp.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L118)

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
