[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2355)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2356)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2357)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2358)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

Bounded retries for a metadata batch that cannot be appended immediately.
