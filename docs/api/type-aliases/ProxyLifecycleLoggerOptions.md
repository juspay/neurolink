[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1830)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1831)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1832)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1833)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1834)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1835)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1837)

Bounded retries for a metadata batch that cannot be appended immediately.
