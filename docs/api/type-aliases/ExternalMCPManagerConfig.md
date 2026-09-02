[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

Defined in: [types/externalMcp.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L382)

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Defined in: [types/externalMcp.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L384)

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/externalMcp.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L387)

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L390)

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L393)

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Defined in: [types/externalMcp.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L396)

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Defined in: [types/externalMcp.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L399)

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Defined in: [types/externalMcp.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L402)

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/externalMcp.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L405)

Log level for external MCP operations
