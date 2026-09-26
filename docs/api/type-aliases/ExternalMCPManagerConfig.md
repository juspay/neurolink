[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPManagerConfig

# Type Alias: ExternalMCPManagerConfig

> **ExternalMCPManagerConfig** = `object`

External MCP manager configuration

## Properties

### maxServers?

> `optional` **maxServers?**: `number`

Maximum number of concurrent servers

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Default timeout for operations

---

### defaultHealthCheckInterval?

> `optional` **defaultHealthCheckInterval?**: `number`

Default health check interval

---

### enableAutoRestart?

> `optional` **enableAutoRestart?**: `boolean`

Whether to enable automatic restart

---

### maxRestartAttempts?

> `optional` **maxRestartAttempts?**: `number`

Maximum restart attempts per server

---

### restartBackoffMultiplier?

> `optional` **restartBackoffMultiplier?**: `number`

Restart backoff multiplier

---

### enablePerformanceMonitoring?

> `optional` **enablePerformanceMonitoring?**: `boolean`

Whether to enable performance monitoring

---

### logLevel?

> `optional` **logLevel?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

Log level for external MCP operations
