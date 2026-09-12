[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterEvents

# Type Alias: ToolRouterEvents

> **ToolRouterEvents** = `object`

Defined in: [types/mcp.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2547)

Tool Router events

## Properties

### routeDecision

> **routeDecision**: `object`

Defined in: [types/mcp.ts:2548](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2548)

#### toolName

> **toolName**: `string`

#### decision

> **decision**: [`RoutingDecision`](RoutingDecision.md)

---

### routeFailed

> **routeFailed**: `object`

Defined in: [types/mcp.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2552)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

#### attemptedServers

> **attemptedServers**: `string`[]

---

### affinitySet

> **affinitySet**: `object`

Defined in: [types/mcp.ts:2557](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2557)

#### key

> **key**: `string`

#### serverId

> **serverId**: `string`

---

### affinityExpired

> **affinityExpired**: `object`

Defined in: [types/mcp.ts:2561](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2561)

#### key

> **key**: `string`

---

### healthUpdate

> **healthUpdate**: `object`

Defined in: [types/mcp.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2564)

#### serverId

> **serverId**: `string`

#### healthy

> **healthy**: `boolean`
