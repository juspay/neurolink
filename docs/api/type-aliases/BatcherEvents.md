[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatcherEvents

# Type Alias: BatcherEvents\<T\>

> **BatcherEvents**\<`T`\> = `object`

Batcher events

## Type Parameters

### T

`T`

## Properties

### batchStarted

> **batchStarted**: `object`

#### batchId

> **batchId**: `string`

#### size

> **size**: `number`

---

### batchCompleted

> **batchCompleted**: `object`

#### batchId

> **batchId**: `string`

#### results

> **results**: [`BatchResult`](BatchResult.md)\<`T`\>[]

---

### batchFailed

> **batchFailed**: `object`

#### batchId

> **batchId**: `string`

#### error

> **error**: `Error`

---

### requestQueued

> **requestQueued**: `object`

#### requestId

> **requestId**: `string`

#### queueSize

> **queueSize**: `number`

---

### flushTriggered

> **flushTriggered**: `object`

#### reason

> **reason**: `"size"` \| `"timeout"` \| `"manual"`

#### queueSize

> **queueSize**: `number`
