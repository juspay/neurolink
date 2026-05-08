[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerEvents

# Type Alias: ExternalMCPServerEvents

> **ExternalMCPServerEvents** = `object`

Defined in: [types/externalMcp.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L305)

External MCP server events

## Properties

### statusChanged

> **statusChanged**: `object`

Defined in: [types/externalMcp.ts:307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L307)

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

Defined in: [types/externalMcp.ts:316](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L316)

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

Defined in: [types/externalMcp.ts:324](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L324)

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

Defined in: [types/externalMcp.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L332)

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

Defined in: [types/externalMcp.ts:340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L340)

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

Defined in: [types/externalMcp.ts:349](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L349)

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

Defined in: [types/externalMcp.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L357)

Health check completed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### health

> **health**: [`ExternalMCPServerHealth`](ExternalMCPServerHealth.md)

#### timestamp

> **timestamp**: `Date`
