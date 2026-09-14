[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2172)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2173)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2175)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2176)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2177)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2180)

Bounded retries for a metadata batch that cannot be appended immediately.
