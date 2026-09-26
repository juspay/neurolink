[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistryEvents

# Type Alias: ToolRegistryEvents

> **ToolRegistryEvents** = `object`

Tool registry events
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### toolRegistered

> **toolRegistered**: `object`

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

#### serverId

> **serverId**: `string`

#### toolName

> **toolName**: `string`

#### timestamp

> **timestamp**: `Date`

---

### toolExecuted

> **toolExecuted**: `object`

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

#### serverId

> **serverId**: `string`

#### timestamp

> **timestamp**: `Date`

---

### discoveryCompleted

> **discoveryCompleted**: `object`

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

#### serverId

> **serverId**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `Date`
