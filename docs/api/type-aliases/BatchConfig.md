[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchConfig

# Type Alias: BatchConfig

> **BatchConfig** = `object`

Defined in: [types/mcp.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2316)

Batch configuration options

## Properties

### maxBatchSize

> **maxBatchSize**: `number`

Defined in: [types/mcp.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2320)

Maximum number of requests to batch together (default: 10)

---

### maxWaitMs

> **maxWaitMs**: `number`

Defined in: [types/mcp.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2325)

Maximum time to wait for a full batch in milliseconds (default: 100ms)

---

### enableParallel?

> `optional` **enableParallel?**: `boolean`

Defined in: [types/mcp.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2331)

Enable parallel execution of batched requests (default: true).
Reserved for future parallel batch execution; currently stored but not read.

---

### maxConcurrentBatches?

> `optional` **maxConcurrentBatches?**: `number`

Defined in: [types/mcp.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2336)

Maximum concurrent batches in flight (default: 5)

---

### groupByServer?

> `optional` **groupByServer?**: `boolean`

Defined in: [types/mcp.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2341)

Group requests by server ID (default: true)
