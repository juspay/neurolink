[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerReadiness

# Type Alias: MCPServerReadiness

> **MCPServerReadiness** = `"ready"` \| `"insufficient_tools"` \| `"failed"`

Defined in: [types/mcp.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L56)

Readiness of an external MCP server registration, distinct from raw
connection status: a server can be "connected" at the transport level yet
still be gated as not ready when it discovers fewer tools than its
configured `minTools` floor.
