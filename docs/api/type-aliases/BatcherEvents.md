[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatcherEvents

# Type Alias: BatcherEvents\<T\>

> **BatcherEvents**\<`T`\> = `object`

Defined in: [types/mcp.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2349)

Batcher events

## Type Parameters

### T

`T`

## Properties

### batchStarted

> **batchStarted**: `object`

Defined in: [types/mcp.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2350)

#### batchId

> **batchId**: `string`

#### size

> **size**: `number`

---

### batchCompleted

> **batchCompleted**: `object`

Defined in: [types/mcp.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2351)

#### batchId

> **batchId**: `string`

#### results

> **results**: [`BatchResult`](BatchResult.md)\<`T`\>[]

---

### batchFailed

> **batchFailed**: `object`

Defined in: [types/mcp.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2352)

#### batchId

> **batchId**: `string`

#### error

> **error**: `Error`

---

### requestQueued

> **requestQueued**: `object`

Defined in: [types/mcp.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2353)

#### requestId

> **requestId**: `string`

#### queueSize

> **queueSize**: `number`

---

### flushTriggered

> **flushTriggered**: `object`

Defined in: [types/mcp.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2354)

#### reason

> **reason**: `"size"` \| `"timeout"` \| `"manual"`

#### queueSize

> **queueSize**: `number`
