[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedTool

# Type Alias: UnifiedTool

> **UnifiedTool** = `object`

Defined in: [types/mcp.ts:1819](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1819)

Unified tool entry from multiple servers

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1823](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1823)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1828](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1828)

Tool description

---

### servers

> **servers**: `object`[]

Defined in: [types/mcp.ts:1833](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1833)

Servers that provide this tool

#### serverId

> **serverId**: `string`

#### serverName

> **serverName**: `string`

#### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

#### priority

> **priority**: `number`

---

### hasConflict

> **hasConflict**: `boolean`

Defined in: [types/mcp.ts:1843](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1843)

Whether this tool has naming conflicts

---

### preferredServerId?

> `optional` **preferredServerId?**: `string`

Defined in: [types/mcp.ts:1848](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1848)

Preferred server for this tool
