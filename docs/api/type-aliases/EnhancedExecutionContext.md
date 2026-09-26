[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedExecutionContext

# Type Alias: EnhancedExecutionContext

> **EnhancedExecutionContext** = [`NeuroLinkExecutionContext`](NeuroLinkExecutionContext.md) & `object`

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
