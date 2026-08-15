[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchConfig

# Type Alias: BatchConfig

> **BatchConfig** = `object`

Defined in: [types/mcp.ts:2278](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2278)

Batch configuration options

## Properties

### maxBatchSize

> **maxBatchSize**: `number`

Defined in: [types/mcp.ts:2282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2282)

Maximum number of requests to batch together (default: 10)

---

### maxWaitMs

> **maxWaitMs**: `number`

Defined in: [types/mcp.ts:2287](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2287)

Maximum time to wait for a full batch in milliseconds (default: 100ms)

---

### enableParallel?

> `optional` **enableParallel?**: `boolean`

Defined in: [types/mcp.ts:2293](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2293)

Enable parallel execution of batched requests (default: true).
Reserved for future parallel batch execution; currently stored but not read.

---

### maxConcurrentBatches?

> `optional` **maxConcurrentBatches?**: `number`

Defined in: [types/mcp.ts:2298](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2298)

Maximum concurrent batches in flight (default: 5)

---

### groupByServer?

> `optional` **groupByServer?**: `boolean`

Defined in: [types/mcp.ts:2303](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2303)

Group requests by server ID (default: true)
