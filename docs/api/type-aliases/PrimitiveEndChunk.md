[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrimitiveEndChunk

# Type Alias: PrimitiveEndChunk

> **PrimitiveEndChunk** = [`NetworkStreamChunkBase`](NetworkStreamChunkBase.md) & `object`

Defined in: [types/agentNetwork.ts:770](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L770)

Primitive end event

## Type Declaration

### type

> **type**: `"primitive-end"`

### primitive

> **primitive**: `object`

#### primitive.type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### primitive.id

> **id**: `string`

#### primitive.name

> **name**: `string`

### output

> **output**: `unknown`
