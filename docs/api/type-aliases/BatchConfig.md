[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchConfig

# Type Alias: BatchConfig

> **BatchConfig** = `object`

Batch configuration options

## Properties

### maxBatchSize

> **maxBatchSize**: `number`

Maximum number of requests to batch together (default: 10)

---

### maxWaitMs

> **maxWaitMs**: `number`

Maximum time to wait for a full batch in milliseconds (default: 100ms)

---

### enableParallel?

> `optional` **enableParallel?**: `boolean`

Enable parallel execution of batched requests (default: true).
Reserved for future parallel batch execution; currently stored but not read.

---

### maxConcurrentBatches?

> `optional` **maxConcurrentBatches?**: `number`

Maximum concurrent batches in flight (default: 5)

---

### groupByServer?

> `optional` **groupByServer?**: `boolean`

Group requests by server ID (default: true)
