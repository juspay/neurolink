[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPHTTPTransportOptions

# Type Alias: MCPHTTPTransportOptions

> **MCPHTTPTransportOptions** = `object`

Transport deadlines (all transports), plus HTTP connection-pool options

## Properties

### connectionTimeout?

> `optional` **connectionTimeout?**: `number`

Explicit connection cap in milliseconds for every transport; absent retains the server/client startup budget.

---

### requestTimeout?

> `optional` **requestTimeout?**: `number`

Explicit whole-request cap in milliseconds for every transport; absent retains caller/server RPC limits (HTTP fetch defaults are separate).

---

### idleTimeout?

> `optional` **idleTimeout?**: `number`

Idle timeout for connection pool (default: 120000)

---

### keepAliveTimeout?

> `optional` **keepAliveTimeout?**: `number`

Keep-alive timeout (default: 30000)
