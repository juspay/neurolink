[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRouterEvents

# Type Alias: ToolRouterEvents

> **ToolRouterEvents** = `object`

Defined in: [types/mcp.ts:2528](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2528)

Tool Router events

## Properties

### routeDecision

> **routeDecision**: `object`

Defined in: [types/mcp.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2529)

#### toolName

> **toolName**: `string`

#### decision

> **decision**: [`RoutingDecision`](RoutingDecision.md)

---

### routeFailed

> **routeFailed**: `object`

Defined in: [types/mcp.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2533)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

#### attemptedServers

> **attemptedServers**: `string`[]

---

### affinitySet

> **affinitySet**: `object`

Defined in: [types/mcp.ts:2538](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2538)

#### key

> **key**: `string`

#### serverId

> **serverId**: `string`

---

### affinityExpired

> **affinityExpired**: `object`

Defined in: [types/mcp.ts:2542](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2542)

#### key

> **key**: `string`

---

### healthUpdate

> **healthUpdate**: `object`

Defined in: [types/mcp.ts:2545](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2545)

#### serverId

> **serverId**: `string`

#### healthy

> **healthy**: `boolean`
