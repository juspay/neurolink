[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1940)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1941)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1942)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1943)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1944)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1945)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1947)

Bounded retries for a metadata batch that cannot be appended immediately.
