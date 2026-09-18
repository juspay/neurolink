[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2200)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2201)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2204)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2206)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

Bounded retries for a metadata batch that cannot be appended immediately.
