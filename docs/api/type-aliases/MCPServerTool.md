[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerTool

# Type Alias: MCPServerTool

> **MCPServerTool** = `object`

Defined in: [types/mcp.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1084)

Enhanced tool definition with annotations.

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1085)

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1086)

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1087)

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1088)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1089)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1090)

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

Defined in: [types/mcp.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1094)
