[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalToolExecutionOptions

# Type Alias: ExternalToolExecutionOptions

> **ExternalToolExecutionOptions** = `object`

Defined in: [types/mcp.ts:579](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L579)

External MCP tool execution options
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:581](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L581)

Execution timeout in milliseconds

---

### context?

> `optional` **context?**: `Partial`\<[`ExternalMCPToolContext`](ExternalMCPToolContext.md)\>

Defined in: [types/mcp.ts:584](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L584)

Additional context for execution

---

### validateInput?

> `optional` **validateInput?**: `boolean`

Defined in: [types/mcp.ts:587](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L587)

Whether to validate input parameters

---

### validateOutput?

> `optional` **validateOutput?**: `boolean`

Defined in: [types/mcp.ts:590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L590)

Whether to validate output
