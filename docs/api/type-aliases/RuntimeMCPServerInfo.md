[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeMCPServerInfo

# Type Alias: RuntimeMCPServerInfo

> **RuntimeMCPServerInfo** = [`MCPServerInfo`](MCPServerInfo.md) & `object`

Defined in: [types/externalMcp.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L402)

Extended MCPServerInfo with runtime state for external servers
Represents the transition towards zero-conversion architecture by combining
configuration fields from MCPServerInfo with runtime-only state needed for
active server management (process handles, clients, metrics, etc.)

## Type Declaration

### process

> **process**: `ChildProcess` \| `null`

Child process handle (for stdio transport, null for HTTP transports)

### client

> **client**: `Client` \| `null`

MCP client instance for communication

### transportInstance

> **transportInstance**: `Transport` \| `null`

Transport instance (renamed from 'transport' to avoid conflict with MCPServerInfo.transport)

### lastError?

> `optional` **lastError?**: `string`

Last error message if any

### startTime?

> `optional` **startTime?**: `Date`

When the server was started

### lastHealthCheck?

> `optional` **lastHealthCheck?**: `Date`

When the server was last seen healthy

### reconnectAttempts

> **reconnectAttempts**: `number`

Number of reconnection attempts

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Maximum reconnection attempts before giving up

### capabilities?

> `optional` **capabilities?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Server capabilities reported during MCP handshake

### healthTimer?

> `optional` **healthTimer?**: `NodeJS.Timeout`

Health monitoring timer

### restartTimer?

> `optional` **restartTimer?**: `NodeJS.Timeout`

Restart backoff timer

### metrics

> **metrics**: `object`

Performance metrics for this server

#### metrics.totalConnections

> **totalConnections**: `number`

#### metrics.totalDisconnections

> **totalDisconnections**: `number`

#### metrics.totalErrors

> **totalErrors**: `number`

#### metrics.totalToolCalls

> **totalToolCalls**: `number`

#### metrics.averageResponseTime

> **averageResponseTime**: `number`

#### metrics.lastResponseTime

> **lastResponseTime**: `number`

### toolsMap

> **toolsMap**: `Map`\<`string`, [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)\>

Legacy compatibility - maintain tools map for now

### toolsArray?

> `optional` **toolsArray?**: `object`[]

Cached tools array for ZERO conversion - MCP format

### config

> **config**: [`MCPServerInfo`](MCPServerInfo.md)

Compatibility field for existing code - stores MCPServerInfo config
