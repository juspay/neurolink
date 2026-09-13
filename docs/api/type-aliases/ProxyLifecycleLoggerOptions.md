[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2073)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2074)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2075)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2076)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2077)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2078)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2079)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2081)

Bounded retries for a metadata batch that cannot be appended immediately.
