[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPPrompt

# Type Alias: MCPPrompt

> **MCPPrompt** = `object`

Defined in: [types/mcp.ts:1991](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1991)

MCP Prompt definition

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:1995](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1995)

Unique prompt name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:2000](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2000)

Human-readable description

---

### arguments?

> `optional` **arguments?**: `object`[]

Defined in: [types/mcp.ts:2005](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2005)

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
