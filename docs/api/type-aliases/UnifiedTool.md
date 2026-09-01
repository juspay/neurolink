[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedTool

# Type Alias: UnifiedTool

> **UnifiedTool** = `object`

Defined in: [types/mcp.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1838)

Unified tool entry from multiple servers

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1842)

Tool name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1847)

Tool description

---

### servers

> **servers**: `object`[]

Defined in: [types/mcp.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1852)

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

Defined in: [types/mcp.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1862)

Whether this tool has naming conflicts

---

### preferredServerId?

> `optional` **preferredServerId?**: `string`

Defined in: [types/mcp.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1867)

Preferred server for this tool
