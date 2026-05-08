[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedExecutionContext

# Type Alias: EnhancedExecutionContext

> **EnhancedExecutionContext** = [`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md) & `object`

Defined in: [types/mcp.ts:2221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2221)

Tool execution context with elicitation support

## Type Declaration

### elicitation

> **elicitation**: [`ElicitationContext`](ElicitationContext.md)

Elicitation context for interactive input

### toolMeta

> **toolMeta**: `object`

Tool metadata

#### toolMeta.name

> **name**: `string`

#### toolMeta.serverId?

> `optional` **serverId?**: `string`

#### toolMeta.annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)
