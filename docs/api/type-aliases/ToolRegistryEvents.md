[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistryEvents

# Type Alias: ToolRegistryEvents

> **ToolRegistryEvents** = `object`

Defined in: [types/mcp.ts:620](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L620)

Tool registry events
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:621](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L621)

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

Defined in: [types/mcp.ts:628](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L628)

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### timestamp

> **timestamp**: `Date`

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:634](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L634)

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

Defined in: [types/mcp.ts:642](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L642)

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `Date`

---

### discoveryCompleted

> **discoveryCompleted**: `object`

Defined in: [types/mcp.ts:647](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L647)

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

Defined in: [types/mcp.ts:654](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L654)

#### serverId

> **serverId**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `Date`
