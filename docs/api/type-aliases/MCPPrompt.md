[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPPrompt

# Type Alias: MCPPrompt

> **MCPPrompt** = `object`

Defined in: [types/mcp.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2010)

MCP Prompt definition

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2014)

Unique prompt name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:2019](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2019)

Human-readable description

---

### arguments?

> `optional` **arguments?**: `object`[]

Defined in: [types/mcp.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2024)

Prompt arguments schema

#### name

> **name**: `string`

Argument name

#### description?

> `optional` **description?**: `string`

Argument description

#### required?

> `optional` **required?**: `boolean`

Whether the argument is required
