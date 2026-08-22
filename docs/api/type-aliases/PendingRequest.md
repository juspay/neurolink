[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingRequest

# Type Alias: PendingRequest\<T\>

> **PendingRequest**\<`T`\> = `object`

Defined in: [types/mcp.ts:2547](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2547)

Pending request in the batcher queue.

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:2548](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2548)

---

### tool

> **tool**: `string`

Defined in: [types/mcp.ts:2549](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2549)

---

### args

> **args**: `unknown`

Defined in: [types/mcp.ts:2550](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2550)

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/mcp.ts:2551](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2551)

---

### resolve

> **resolve**: (`value`) => `void`

Defined in: [types/mcp.ts:2552](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2552)

#### Parameters

##### value

`T`

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/mcp.ts:2553](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2553)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### addedAt

> **addedAt**: `number`

Defined in: [types/mcp.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2554)
