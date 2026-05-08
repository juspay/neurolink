[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatcherEvents

# Type Alias: BatcherEvents\<T\>

> **BatcherEvents**\<`T`\> = `object`

Defined in: [types/mcp.ts:2330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2330)

Batcher events

## Type Parameters

### T

`T`

## Properties

### batchStarted

> **batchStarted**: `object`

Defined in: [types/mcp.ts:2331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2331)

#### batchId

> **batchId**: `string`

#### size

> **size**: `number`

---

### batchCompleted

> **batchCompleted**: `object`

Defined in: [types/mcp.ts:2332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2332)

#### batchId

> **batchId**: `string`

#### results

> **results**: [`BatchResult`](BatchResult.md)\<`T`\>[]

---

### batchFailed

> **batchFailed**: `object`

Defined in: [types/mcp.ts:2333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2333)

#### batchId

> **batchId**: `string`

#### error

> **error**: `Error`

---

### requestQueued

> **requestQueued**: `object`

Defined in: [types/mcp.ts:2334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2334)

#### requestId

> **requestId**: `string`

#### queueSize

> **queueSize**: `number`

---

### flushTriggered

> **flushTriggered**: `object`

Defined in: [types/mcp.ts:2335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2335)

#### reason

> **reason**: `"size"` \| `"timeout"` \| `"manual"`

#### queueSize

> **queueSize**: `number`
