[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Defined in: [types/proxy.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1946)

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1947)

---

### logDir?

> `optional` **logDir?**: `string`

Defined in: [types/proxy.ts:1948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1948)

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

Defined in: [types/proxy.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1949)

---

### batchSize?

> `optional` **batchSize?**: `number`

Defined in: [types/proxy.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1950)

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

Defined in: [types/proxy.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1951)

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Defined in: [types/proxy.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1953)

Bounded retries for a metadata batch that cannot be appended immediately.
