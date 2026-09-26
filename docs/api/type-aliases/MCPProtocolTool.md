[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPProtocolTool

# Type Alias: MCPProtocolTool

> **MCPProtocolTool** = `object`

MCP protocol tool format (from @modelcontextprotocol/sdk)

## Properties

### name

> **name**: `string`

Tool name

---

### description?

> `optional` **description?**: `string`

Tool description

---

### inputSchema

> **inputSchema**: `object`

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
