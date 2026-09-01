[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerEvents

# Type Alias: ExternalMCPServerEvents

> **ExternalMCPServerEvents** = `object`

Defined in: [types/externalMcp.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L311)

External MCP server events

## Properties

### statusChanged

> **statusChanged**: `object`

Defined in: [types/externalMcp.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L313)

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

Defined in: [types/externalMcp.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L322)

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

Defined in: [types/externalMcp.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L330)

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

Defined in: [types/externalMcp.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L338)

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

Defined in: [types/externalMcp.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L346)

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

Defined in: [types/externalMcp.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L355)

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

Defined in: [types/externalMcp.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L363)

Health check completed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### health

> **health**: [`ExternalMCPServerHealth`](ExternalMCPServerHealth.md)

#### timestamp

> **timestamp**: `Date`
