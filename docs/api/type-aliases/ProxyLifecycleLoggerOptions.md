[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1926)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1932)

Bounded retries for a metadata batch that cannot be appended immediately.
