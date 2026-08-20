[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1836)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1837)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1838)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1839)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1840)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1841)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1843)

Bounded retries for a metadata batch that cannot be appended immediately.
