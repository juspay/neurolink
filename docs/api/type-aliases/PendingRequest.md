[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingRequest

# Type Alias: PendingRequest\<T\>

> **PendingRequest**\<`T`\> = `object`

Defined in: [types/mcp.ts:2566](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2566)

Pending request in the batcher queue.

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:2567](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2567)

---

### tool

> **tool**: `string`

Defined in: [types/mcp.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2568)

---

### args

> **args**: `unknown`

Defined in: [types/mcp.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2569)

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/mcp.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2570)

---

### resolve

> **resolve**: (`value`) => `void`

Defined in: [types/mcp.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2571)

#### Parameters

##### value

`T`

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/mcp.ts:2572](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2572)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### addedAt

> **addedAt**: `number`

Defined in: [types/mcp.ts:2573](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2573)
