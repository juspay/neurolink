[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchConfig

# Type Alias: BatchConfig

> **BatchConfig** = `object`

Defined in: [types/mcp.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2297)

Batch configuration options

## Properties

### maxBatchSize

> **maxBatchSize**: `number`

Defined in: [types/mcp.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2301)

Maximum number of requests to batch together (default: 10)

---

### maxWaitMs

> **maxWaitMs**: `number`

Defined in: [types/mcp.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2306)

Maximum time to wait for a full batch in milliseconds (default: 100ms)

---

### enableParallel?

> `optional` **enableParallel?**: `boolean`

Defined in: [types/mcp.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2312)

Enable parallel execution of batched requests (default: true).
Reserved for future parallel batch execution; currently stored but not read.

---

### maxConcurrentBatches?

> `optional` **maxConcurrentBatches?**: `number`

Defined in: [types/mcp.ts:2317](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2317)

Maximum concurrent batches in flight (default: 5)

---

### groupByServer?

> `optional` **groupByServer?**: `boolean`

Defined in: [types/mcp.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2322)

Group requests by server ID (default: true)
