[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

Defined in: [types/externalMcp.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L394)

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Defined in: [types/externalMcp.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L396)

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/externalMcp.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L399)

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L402)

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L405)

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Defined in: [types/externalMcp.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L408)

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Defined in: [types/externalMcp.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L411)

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Defined in: [types/externalMcp.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L414)

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/externalMcp.ts:417](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L417)

Log level for external MCP operations
