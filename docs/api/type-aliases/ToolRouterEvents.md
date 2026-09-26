[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterEvents

# Type Alias: ToolRouterEvents

> **ToolRouterEvents** = `object`

Tool Router events

## Properties

### routeDecision

> **routeDecision**: `object`

#### toolName

> **toolName**: `string`

#### decision

> **decision**: [`RoutingDecision`](RoutingDecision.md)

---

### routeFailed

> **routeFailed**: `object`

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

#### attemptedServers

> **attemptedServers**: `string`[]

---

### affinitySet

> **affinitySet**: `object`

#### key

> **key**: `string`

#### serverId

> **serverId**: `string`

---

### affinityExpired

> **affinityExpired**: `object`

#### key

> **key**: `string`

---

### healthUpdate

> **healthUpdate**: `object`

#### serverId

> **serverId**: `string`

#### healthy

> **healthy**: `boolean`
