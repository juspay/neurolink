[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerEvents

# Type Alias: ExternalMCPServerEvents

> **ExternalMCPServerEvents** = `object`

Defined in: [types/externalMcp.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L339)

External MCP server events

## Properties

### statusChanged

> **statusChanged**: `object`

Defined in: [types/externalMcp.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L341)

Server status changed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### oldStatus

> **oldStatus**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

#### newStatus

> **newStatus**: [`ExternalMCPServerStatus`](ExternalMCPServerStatus.md)

#### timestamp

> **timestamp**: `Date`

---

### connected

> **connected**: `object`

Defined in: [types/externalMcp.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L350)

Server connected successfully

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### toolCount

> **toolCount**: `number`

#### timestamp

> **timestamp**: `Date`

---

### disconnected

> **disconnected**: `object`

Defined in: [types/externalMcp.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L358)

Server disconnected

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### reason?

> `optional` **reason?**: `string`

#### timestamp

> **timestamp**: `Date`

---

### failed

> **failed**: `object`

Defined in: [types/externalMcp.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L366)

Server failed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### error

> **error**: `string`

#### timestamp

> **timestamp**: `Date`

---

### toolDiscovered

> **toolDiscovered**: `object`

Defined in: [types/externalMcp.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L374)

Tool discovered

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### toolName

> **toolName**: `string`

#### toolInfo

> **toolInfo**: [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)

#### timestamp

> **timestamp**: `Date`

---

### toolRemoved

> **toolRemoved**: `object`

Defined in: [types/externalMcp.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L383)

Tool removed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### toolName

> **toolName**: `string`

#### timestamp

> **timestamp**: `Date`

---

### healthCheck

> **healthCheck**: `object`

Defined in: [types/externalMcp.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L391)

Health check completed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### health

> **health**: [`ExternalMCPServerHealth`](ExternalMCPServerHealth.md)

#### timestamp

> **timestamp**: `Date`
