[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2476)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2477)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2478)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2479)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2480)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2481)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2482)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2484)

Bounded retries for a metadata batch that cannot be appended immediately.
