[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDiscoveryResult

# Type Alias: ToolDiscoveryResult

> **ToolDiscoveryResult** = `object`

Defined in: [types/mcp.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L555)

Tool discovery result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L557)

Whether discovery was successful

---

### toolCount

> **toolCount**: `number`

Defined in: [types/mcp.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L560)

Number of tools discovered

---

### tools

> **tools**: [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)[]

Defined in: [types/mcp.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L563)

Discovered tools

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L566)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L569)

Discovery duration in milliseconds

---

### serverId

> **serverId**: `string`

Defined in: [types/mcp.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L572)

Server ID
