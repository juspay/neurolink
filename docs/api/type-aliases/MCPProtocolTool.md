[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPProtocolTool

# Type Alias: MCPProtocolTool

> **MCPProtocolTool** = `object`

Defined in: [types/mcp.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2178)

MCP protocol tool format (from @modelcontextprotocol/sdk)

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2182)

Tool name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2187)

Tool description

---

### inputSchema

> **inputSchema**: `object`

Defined in: [types/mcp.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2192)

JSON Schema for input

#### type

> **type**: `"object"`

#### properties?

> `optional` **properties?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### required?

> `optional` **required?**: `string`[]

---

### annotations?

> `optional` **annotations?**: `object`

Defined in: [types/mcp.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2201)

Optional annotations (MCP 2024-11-05+)

#### title?

> `optional` **title?**: `string`

#### readOnlyHint?

> `optional` **readOnlyHint?**: `boolean`

#### destructiveHint?

> `optional` **destructiveHint?**: `boolean`

#### idempotentHint?

> `optional` **idempotentHint?**: `boolean`

#### openWorldHint?

> `optional` **openWorldHint?**: `boolean`
