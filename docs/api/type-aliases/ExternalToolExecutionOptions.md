[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalToolExecutionOptions

# Type Alias: ExternalToolExecutionOptions

> **ExternalToolExecutionOptions** = `object`

External MCP tool execution options
Moved from src/lib/mcp/toolDiscoveryService.ts

## Properties

### timeout?

> `optional` **timeout?**: `number`

Execution timeout in milliseconds

---

### context?

> `optional` **context?**: `Partial`\<[`ExternalMCPToolContext`](ExternalMCPToolContext.md)\>

Additional context for execution

---

### validateInput?

> `optional` **validateInput?**: `boolean`

Whether to validate input parameters

---

### validateOutput?

> `optional` **validateOutput?**: `boolean`

Whether to validate output
