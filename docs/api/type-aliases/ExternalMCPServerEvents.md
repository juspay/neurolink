[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPServerEvents

# Type Alias: ExternalMCPServerEvents

> **ExternalMCPServerEvents** = `object`

External MCP server events

## Properties

### statusChanged

> **statusChanged**: `object`

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

Health check completed

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### health

> **health**: [`ExternalMCPServerHealth`](ExternalMCPServerHealth.md)

#### timestamp

> **timestamp**: `Date`
