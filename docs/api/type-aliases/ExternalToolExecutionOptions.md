[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalToolExecutionOptions

# Type Alias: ExternalToolExecutionOptions

> **ExternalToolExecutionOptions** = `object`

Defined in: [types/mcp.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L598)

External MCP tool execution options
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L600)

Execution timeout in milliseconds

---

### context?

> `optional` **context?**: `Partial`\<[`ExternalMCPToolContext`](ExternalMCPToolContext.md)\>

Defined in: [types/mcp.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L603)

Additional context for execution

---

### validateInput?

> `optional` **validateInput?**: `boolean`

Defined in: [types/mcp.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L606)

Whether to validate input parameters

---

### validateOutput?

> `optional` **validateOutput?**: `boolean`

Defined in: [types/mcp.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L609)

Whether to validate output
