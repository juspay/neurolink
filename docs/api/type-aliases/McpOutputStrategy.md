[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpOutputStrategy

# Type Alias: McpOutputStrategy

> **McpOutputStrategy** = `"inline"` \| `"externalize"`

Defined in: [types/mcpOutput.ts:16](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcpOutput.ts#L16)

Two honest strategies for oversized MCP tool outputs:

- "inline" Full payload always sent to the model (warning logged above warnBytes).
- "externalize" Full payload stored as an artifact; model receives a compact
  surrogate with head/tail preview and an artifact ID it can
  resolve via retrieve_context with offset/limit pagination.
