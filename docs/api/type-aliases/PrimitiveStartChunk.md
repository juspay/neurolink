[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrimitiveStartChunk

# Type Alias: PrimitiveStartChunk

> **PrimitiveStartChunk** = [`NetworkStreamChunkBase`](NetworkStreamChunkBase.md) & `object`

Defined in: [types/agentNetwork.ts:757](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L757)

Primitive start event

## Type Declaration

### type

> **type**: `"primitive-start"`

### primitive

> **primitive**: `object`

#### primitive.type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### primitive.id

> **id**: `string`

#### primitive.name

> **name**: `string`

### input

> **input**: `unknown`
