[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerTool

# Type Alias: MCPServerTool

> **MCPServerTool** = `object`

Enhanced tool definition with annotations.

## Properties

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### inputSchema?

> `optional` **inputSchema?**: [`JsonObject`](JsonObject.md)

---

### outputSchema?

> `optional` **outputSchema?**: [`JsonObject`](JsonObject.md)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

---

### execute

> **execute**: (`params`, `context?`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

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
