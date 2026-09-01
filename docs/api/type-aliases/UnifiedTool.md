[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedTool

# Type Alias: UnifiedTool

> **UnifiedTool** = `object`

Defined in: [types/mcp.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1857)

Unified tool entry from multiple servers

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1861)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1866)

Tool description

---

### servers

> **servers**: `object`[]

Defined in: [types/mcp.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1871)

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

Defined in: [types/mcp.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1881)

Whether this tool has naming conflicts

---

### preferredServerId?

> `optional` **preferredServerId?**: `string`

Defined in: [types/mcp.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1886)

Preferred server for this tool
