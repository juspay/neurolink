[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPPrompt

# Type Alias: MCPPrompt

> **MCPPrompt** = `object`

Defined in: [types/mcp.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2029)

MCP Prompt definition

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2033)

Unique prompt name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2038)

Human-readable description

---

### arguments?

> `optional` **arguments?**: `object`[]

Defined in: [types/mcp.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2043)

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
