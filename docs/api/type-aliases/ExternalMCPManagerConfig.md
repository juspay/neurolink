[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

Defined in: [types/externalMcp.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L368)

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Defined in: [types/externalMcp.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L370)

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/externalMcp.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L373)

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Defined in: [types/externalMcp.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L376)

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Defined in: [types/externalMcp.ts:379](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L379)

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Defined in: [types/externalMcp.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L382)

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Defined in: [types/externalMcp.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L385)

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Defined in: [types/externalMcp.ts:388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L388)

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Defined in: [types/externalMcp.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/externalMcp.ts#L391)

Log level for external MCP operations
