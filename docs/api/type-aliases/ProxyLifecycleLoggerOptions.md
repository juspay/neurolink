[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2304)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2305)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2306)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2307)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2308)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2309)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

Bounded retries for a metadata batch that cannot be appended immediately.
