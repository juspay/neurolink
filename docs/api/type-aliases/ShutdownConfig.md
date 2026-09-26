[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ShutdownConfig

# Type Alias: ShutdownConfig

> **ShutdownConfig** = `object`

Configuration for graceful shutdown behavior

## Properties

### gracefulShutdownTimeoutMs?

> `optional` **gracefulShutdownTimeoutMs?**: `number`

Maximum time to wait for graceful shutdown in milliseconds
Default: 30000 (30 seconds)

---

### drainTimeoutMs?

> `optional` **drainTimeoutMs?**: `number`

Maximum time to wait for connections to drain in milliseconds
Default: 15000 (15 seconds)

---

### forceClose?

> `optional` **forceClose?**: `boolean`

Whether to force close connections after timeout
Default: true
