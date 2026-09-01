[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerTool

# Type Alias: MCPServerTool

> **MCPServerTool** = `object`

Defined in: [types/mcp.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1065)

Enhanced tool definition with annotations.

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1066)

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1067)

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1068)

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1069)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1070)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1071)

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

Defined in: [types/mcp.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1075)
