[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedExecutionContext

# Type Alias: EnhancedExecutionContext

> **EnhancedExecutionContext** = [`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md) & `object`

Defined in: [types/mcp.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2221)

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
