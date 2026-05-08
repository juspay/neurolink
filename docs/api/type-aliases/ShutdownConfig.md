[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ShutdownConfig

# Type Alias: ShutdownConfig

> **ShutdownConfig** = `object`

Defined in: [types/server.ts:1017](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1017)

Configuration for graceful shutdown behavior

## Properties

### gracefulShutdownTimeoutMs?

> `optional` **gracefulShutdownTimeoutMs?**: `number`

Defined in: [types/server.ts:1022](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1022)

Maximum time to wait for graceful shutdown in milliseconds
Default: 30000 (30 seconds)

---

### drainTimeoutMs?

> `optional` **drainTimeoutMs?**: `number`

Defined in: [types/server.ts:1028](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1028)

Maximum time to wait for connections to drain in milliseconds
Default: 15000 (15 seconds)

---

### forceClose?

> `optional` **forceClose?**: `boolean`

Defined in: [types/server.ts:1034](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1034)

Whether to force close connections after timeout
Default: true
