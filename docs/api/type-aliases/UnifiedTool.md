[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UnifiedTool

# Type Alias: UnifiedTool

> **UnifiedTool** = `object`

Unified tool entry from multiple servers

## Properties

### name

> **name**: `string`

Tool name

---

### description

> **description**: `string`

Tool description

---

### servers

> **servers**: `object`[]

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

Whether this tool has naming conflicts

---

### preferredServerId?

> `optional` **preferredServerId?**: `string`

Preferred server for this tool
