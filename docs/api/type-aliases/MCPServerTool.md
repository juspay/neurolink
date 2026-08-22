[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerTool

# Type Alias: MCPServerTool

> **MCPServerTool** = `object`

Defined in: [types/mcp.ts:1046](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1046)

Enhanced tool definition with annotations.

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1047](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1047)

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1048](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1048)

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1049](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1049)

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1050](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1050)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1051](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1051)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:1052](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1052)

#### Parameters

##### params

`unknown`

##### context?

[`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md)

#### Returns

`Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/mcp.ts:1056](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1056)
