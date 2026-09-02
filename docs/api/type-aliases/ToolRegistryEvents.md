[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistryEvents

# Type Alias: ToolRegistryEvents

> **ToolRegistryEvents** = `object`

Defined in: [types/mcp.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L639)

Tool registry events
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L640)

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### toolInfo

> **toolInfo**: [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)

#### timestamp

> **timestamp**: `Date`

---

### toolUnregistered

> **toolUnregistered**: `object`

Defined in: [types/mcp.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L647)

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### timestamp

> **timestamp**: `Date`

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L653)

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### success

> **success**: `boolean`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### discoveryStarted

> **discoveryStarted**: `object`

Defined in: [types/mcp.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L661)

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `Date`

---

### discoveryCompleted

> **discoveryCompleted**: `object`

Defined in: [types/mcp.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L666)

#### serverId

> **serverId**: `string`

#### toolCount

> **toolCount**: `number`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### discoveryFailed

> **discoveryFailed**: `object`

Defined in: [types/mcp.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L673)

#### serverId

> **serverId**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `Date`
