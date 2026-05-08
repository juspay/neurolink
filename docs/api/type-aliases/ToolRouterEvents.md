[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterEvents

# Type Alias: ToolRouterEvents

> **ToolRouterEvents** = `object`

Defined in: [types/mcp.ts:2509](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2509)

Tool Router events

## Properties

### routeDecision

> **routeDecision**: `object`

Defined in: [types/mcp.ts:2510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2510)

#### toolName

> **toolName**: `string`

#### decision

> **decision**: [`RoutingDecision`](RoutingDecision.md)

---

### routeFailed

> **routeFailed**: `object`

Defined in: [types/mcp.ts:2514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2514)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

#### attemptedServers

> **attemptedServers**: `string`[]

---

### affinitySet

> **affinitySet**: `object`

Defined in: [types/mcp.ts:2519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2519)

#### key

> **key**: `string`

#### serverId

> **serverId**: `string`

---

### affinityExpired

> **affinityExpired**: `object`

Defined in: [types/mcp.ts:2523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2523)

#### key

> **key**: `string`

---

### healthUpdate

> **healthUpdate**: `object`

Defined in: [types/mcp.ts:2526](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2526)

#### serverId

> **serverId**: `string`

#### healthy

> **healthy**: `boolean`
