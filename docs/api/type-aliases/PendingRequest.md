[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingRequest

# Type Alias: PendingRequest\<T\>

> **PendingRequest**\<`T`\> = `object`

Defined in: [types/mcp.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2585)

Pending request in the batcher queue.

## Type Parameters

### T

`T` = `unknown`

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:2586](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2586)

---

### tool

> **tool**: `string`

Defined in: [types/mcp.ts:2587](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2587)

---

### args

> **args**: `unknown`

Defined in: [types/mcp.ts:2588](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2588)

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/mcp.ts:2589](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2589)

---

### resolve

> **resolve**: (`value`) => `void`

Defined in: [types/mcp.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2590)

#### Parameters

##### value

`T`

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/mcp.ts:2591](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2591)

#### Parameters

##### error

`Error`

#### Returns

`void`

---

### addedAt

> **addedAt**: `number`

Defined in: [types/mcp.ts:2592](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2592)
