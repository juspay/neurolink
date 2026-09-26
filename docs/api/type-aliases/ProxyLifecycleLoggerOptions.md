[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2445)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2446)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2447)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2448)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2449)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2450)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2451)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2453)

Bounded retries for a metadata batch that cannot be appended immediately.
