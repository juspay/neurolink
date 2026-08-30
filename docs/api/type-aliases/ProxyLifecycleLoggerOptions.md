[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1903)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1904)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1905)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1906)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1907)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1908)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1910)

Bounded retries for a metadata batch that cannot be appended immediately.
