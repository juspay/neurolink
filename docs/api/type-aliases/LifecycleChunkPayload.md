[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleChunkPayload

# Type Alias: LifecycleChunkPayload

> **LifecycleChunkPayload** = `object`

Defined in: [types/middleware.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L305)

Payload delivered to onChunk callbacks for each streaming chunk.

## Properties

### type

> **type**: `string`

Defined in: [types/middleware.ts:307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L307)

Chunk type from the AI SDK stream

---

### textDelta?

> `optional` **textDelta?**: `string`

Defined in: [types/middleware.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L309)

Text content for text-delta chunks

---

### sequenceNumber

> **sequenceNumber**: `number`

Defined in: [types/middleware.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L311)

Zero-based chunk sequence number
