[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolInfo

# Type Alias: ToolInfo

> **ToolInfo** = `object`

Defined in: [types/tools.ts:119](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L119)

Tool information with extensibility
Moved from src/lib/mcp/contracts/mcpContract.ts

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### name

> **name**: `string`

Defined in: [types/tools.ts:120](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L120)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tools.ts:121](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L121)

---

### category?

> `optional` **category?**: `string`

Defined in: [types/tools.ts:122](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L122)

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/tools.ts:123](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L123)

---

### inputSchema?

> `optional` **inputSchema?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/tools.ts:124](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L124)

---

### outputSchema?

> `optional` **outputSchema?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/tools.ts:125](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L125)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/tools.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L127)

MCP tool annotations (safety hints, metadata). Auto-inferred when mcp.annotations.autoInfer is enabled.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:129](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L129)

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:130](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L130)
