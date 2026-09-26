[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerReadiness

# Type Alias: MCPServerReadiness

> **MCPServerReadiness** = `"ready"` \| `"insufficient_tools"` \| `"failed"`

Readiness of an external MCP server registration, distinct from raw
connection status: a server can be "connected" at the transport level yet
still be gated as not ready when it discovers fewer tools than its
configured `minTools` floor.
