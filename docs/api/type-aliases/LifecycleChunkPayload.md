[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleChunkPayload

# Type Alias: LifecycleChunkPayload

> **LifecycleChunkPayload** = `object`

Defined in: [types/middleware.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L329)

Payload delivered to onChunk callbacks for each streaming chunk.

## Properties

### type

> **type**: `string`

Defined in: [types/middleware.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L331)

Chunk type from the AI SDK stream

---

### textDelta?

> `optional` **textDelta?**: `string`

Defined in: [types/middleware.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L333)

Text content for text-delta chunks

---

### sequenceNumber

> **sequenceNumber**: `number`

Defined in: [types/middleware.ts:335](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L335)

Zero-based chunk sequence number
