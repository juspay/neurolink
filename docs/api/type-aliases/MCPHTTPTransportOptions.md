[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPHTTPTransportOptions

# Type Alias: MCPHTTPTransportOptions

> **MCPHTTPTransportOptions** = `object`

Defined in: [types/mcp.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L186)

HTTP Transport Options for fine-grained control

## Properties

### connectionTimeout?

> `optional` **connectionTimeout?**: `number`

Defined in: [types/mcp.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L188)

Connection timeout in milliseconds (default: 30000)

---

### requestTimeout?

> `optional` **requestTimeout?**: `number`

Defined in: [types/mcp.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L190)

Request timeout in milliseconds (default: 60000)

---

### idleTimeout?

> `optional` **idleTimeout?**: `number`

Defined in: [types/mcp.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L192)

Idle timeout for connection pool (default: 120000)

---

### keepAliveTimeout?

> `optional` **keepAliveTimeout?**: `number`

Defined in: [types/mcp.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L194)

Keep-alive timeout (default: 30000)
