[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolInfo

# Type Alias: ToolInfo

> **ToolInfo** = `object`

Tool information with extensibility
Moved from src/lib/mcp/contracts/mcpContract.ts

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### name

> **name**: `string`

---

### description?

> `optional` **description?**: `string`

---

### category?

> `optional` **category?**: `string`

---

### serverId?

> `optional` **serverId?**: `string`

---

### inputSchema?

> `optional` **inputSchema?**: [`StandardRecord`](StandardRecord.md)

---

### outputSchema?

> `optional` **outputSchema?**: [`StandardRecord`](StandardRecord.md)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

MCP tool annotations (safety hints, metadata). Auto-inferred when mcp.annotations.autoInfer is enabled.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Ceiling on the WHOLE execution — every attempt plus the delays between
them. Declared explicitly rather than left to the index signature below,
which would type it `unknown` and silently defeat the default.
