[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatcherEvents

# Type Alias: BatcherEvents\<T\>

> **BatcherEvents**\<`T`\> = `object`

Defined in: [types/mcp.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2368)

Batcher events

## Type Parameters

### T

`T`

## Properties

### batchStarted

> **batchStarted**: `object`

Defined in: [types/mcp.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2369)

#### batchId

> **batchId**: `string`

#### size

> **size**: `number`

---

### batchCompleted

> **batchCompleted**: `object`

Defined in: [types/mcp.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2370)

#### batchId

> **batchId**: `string`

#### results

> **results**: [`BatchResult`](BatchResult.md)\<`T`\>[]

---

### batchFailed

> **batchFailed**: `object`

Defined in: [types/mcp.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2371)

#### batchId

> **batchId**: `string`

#### error

> **error**: `Error`

---

### requestQueued

> **requestQueued**: `object`

Defined in: [types/mcp.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2372)

#### requestId

> **requestId**: `string`

#### queueSize

> **queueSize**: `number`

---

### flushTriggered

> **flushTriggered**: `object`

Defined in: [types/mcp.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2373)

#### reason

> **reason**: `"size"` \| `"timeout"` \| `"manual"`

#### queueSize

> **queueSize**: `number`
