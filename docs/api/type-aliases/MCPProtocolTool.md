[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPProtocolTool

# Type Alias: MCPProtocolTool

> **MCPProtocolTool** = `object`

Defined in: [types/mcp.ts:2159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2159)

MCP protocol tool format (from @modelcontextprotocol/sdk)

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2163)

Tool name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:2168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2168)

Tool description

---

### inputSchema

> **inputSchema**: `object`

Defined in: [types/mcp.ts:2173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2173)

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

Defined in: [types/mcp.ts:2182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2182)

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
