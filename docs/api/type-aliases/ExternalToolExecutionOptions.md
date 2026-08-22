[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalToolExecutionOptions

# Type Alias: ExternalToolExecutionOptions

> **ExternalToolExecutionOptions** = `object`

Defined in: [types/mcp.ts:579](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L579)

External MCP tool execution options
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:581](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L581)

Execution timeout in milliseconds

---

### context?

> `optional` **context?**: `Partial`\<[`ExternalMCPToolContext`](ExternalMCPToolContext.md)\>

Defined in: [types/mcp.ts:584](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L584)

Additional context for execution

---

### validateInput?

> `optional` **validateInput?**: `boolean`

Defined in: [types/mcp.ts:587](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L587)

Whether to validate input parameters

---

### validateOutput?

> `optional` **validateOutput?**: `boolean`

Defined in: [types/mcp.ts:590](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L590)

Whether to validate output
