[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDiscoveryResult

# Type Alias: ToolDiscoveryResult

> **ToolDiscoveryResult** = `object`

Defined in: [types/mcp.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L574)

Tool discovery result
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L576)

Whether discovery was successful

---

### toolCount

> **toolCount**: `number`

Defined in: [types/mcp.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L579)

Number of tools discovered

---

### tools

> **tools**: [`ExternalMCPToolInfo`](ExternalMCPToolInfo.md)[]

Defined in: [types/mcp.ts:582](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L582)

Discovered tools

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L585)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L588)

Discovery duration in milliseconds

---

### serverId

> **serverId**: `string`

Defined in: [types/mcp.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L591)

Server ID
