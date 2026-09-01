[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPHTTPTransportOptions

# Type Alias: MCPHTTPTransportOptions

> **MCPHTTPTransportOptions** = `object`

Defined in: [types/mcp.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L205)

HTTP Transport Options for fine-grained control

## Properties

### connectionTimeout?

> `optional` **connectionTimeout?**: `number`

Defined in: [types/mcp.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L207)

Connection timeout in milliseconds (default: 30000)

---

### requestTimeout?

> `optional` **requestTimeout?**: `number`

Defined in: [types/mcp.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L209)

Request timeout in milliseconds (default: 60000)

---

### idleTimeout?

> `optional` **idleTimeout?**: `number`

Defined in: [types/mcp.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L211)

Idle timeout for connection pool (default: 120000)

---

### keepAliveTimeout?

> `optional` **keepAliveTimeout?**: `number`

Defined in: [types/mcp.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L213)

Keep-alive timeout (default: 30000)
