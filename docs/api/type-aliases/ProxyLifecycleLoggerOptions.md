[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:2466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2466)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

Defined in: [types/proxy.ts:2467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2467)

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:2468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2468)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:2469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2469)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2470)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:2471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2471)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2474)

Bounded retries for a metadata batch that cannot be appended immediately.
