[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleLoggerOptions

# Type Alias: ProxyLifecycleLoggerOptions

> **ProxyLifecycleLoggerOptions** = `object`

Lifecycle logger configuration. Queue overrides are used by stress tests.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `"proxy-lifecycle"` \| `"proxy-supervisor"`

---

### enabled

> **enabled**: `boolean`

---

### logDir?

> `optional` **logDir?**: `string`

---

### queueCapacity?

> `optional` **queueCapacity?**: `number`

---

### batchSize?

> `optional` **batchSize?**: `number`

---

### flushIntervalMs?

> `optional` **flushIntervalMs?**: `number`

---

### maxWriteRetries?

> `optional` **maxWriteRetries?**: `number`

Bounded retries for a metadata batch that cannot be appended immediately.
