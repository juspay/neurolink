[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalToolExecutionOptions

# Type Alias: ExternalToolExecutionOptions

> **ExternalToolExecutionOptions** = `object`

Defined in: [types/mcp.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L617)

External MCP tool execution options
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/mcp.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L619)

Execution timeout in milliseconds

---

### context?

> `optional` **context?**: `Partial`\<[`ExternalMCPToolContext`](ExternalMCPToolContext.md)\>

Defined in: [types/mcp.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L622)

Additional context for execution

---

### validateInput?

> `optional` **validateInput?**: `boolean`

Defined in: [types/mcp.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L625)

Whether to validate input parameters

---

### validateOutput?

> `optional` **validateOutput?**: `boolean`

Defined in: [types/mcp.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L628)

Whether to validate output
