[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

Defined in: [types/externalMcp.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L402)

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Defined in: [types/externalMcp.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L404)

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/externalMcp.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L407)

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L410)

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:413](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L413)

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Defined in: [types/externalMcp.ts:416](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L416)

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Defined in: [types/externalMcp.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L419)

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Defined in: [types/externalMcp.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L422)

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/externalMcp.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L425)

Log level for external MCP operations
