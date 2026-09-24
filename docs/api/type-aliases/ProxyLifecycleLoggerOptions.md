[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2378)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2379)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2380)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2381)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2382)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2383)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2384)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2386)

Bounded retries for a metadata batch that cannot be appended immediately.
