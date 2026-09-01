[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

Defined in: [types/externalMcp.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L374)

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Defined in: [types/externalMcp.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L376)

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/externalMcp.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L379)

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L382)

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L385)

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Defined in: [types/externalMcp.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L388)

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Defined in: [types/externalMcp.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L391)

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Defined in: [types/externalMcp.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L394)

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/externalMcp.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L397)

Log level for external MCP operations
