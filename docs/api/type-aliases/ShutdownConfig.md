[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ShutdownConfig

# Type Alias: ShutdownConfig

> **ShutdownConfig** = `object`

Defined in: [types/server.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1026)

Configuration for graceful shutdown behavior

## Properties

### gracefulShutdownTimeoutMs?

> `optional` **gracefulShutdownTimeoutMs?**: `number`

Defined in: [types/server.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1031)

Maximum time to wait for graceful shutdown in milliseconds
Default: 30000 (30 seconds)

---

### drainTimeoutMs?

> `optional` **drainTimeoutMs?**: `number`

Defined in: [types/server.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1037)

Maximum time to wait for connections to drain in milliseconds
Default: 15000 (15 seconds)

---

### forceClose?

> `optional` **forceClose?**: `boolean`

Defined in: [types/server.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1043)

Whether to force close connections after timeout
Default: true
