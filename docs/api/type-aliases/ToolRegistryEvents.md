[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistryEvents

# Type Alias: ToolRegistryEvents

> **ToolRegistryEvents** = `object`

Defined in: [types/mcp.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L658)

Tool registry events
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L659)

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

Defined in: [types/mcp.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L666)

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### timestamp

> **timestamp**: `Date`

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L672)

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

Defined in: [types/mcp.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L680)

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `Date`

---

### discoveryCompleted

> **discoveryCompleted**: `object`

Defined in: [types/mcp.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L685)

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

Defined in: [types/mcp.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L692)

#### serverId

> **serverId**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `Date`
