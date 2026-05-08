[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpOutputStrategy

# Type Alias: McpOutputStrategy

> **McpOutputStrategy** = `"inline"` \| `"externalize"`

Defined in: [types/mcpOutput.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcpOutput.ts#L16)

Two honest strategies for oversized MCP tool outputs:

- "inline" Full payload always sent to the model (warning logged above warnBytes).
- "externalize" Full payload stored as an artifact; model receives a compact
  surrogate with head/tail preview and an artifact ID it can
  resolve via retrieve_context with offset/limit pagination.
