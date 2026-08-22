[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleChunkPayload

# Type Alias: LifecycleChunkPayload

> **LifecycleChunkPayload** = `object`

Defined in: [types/middleware.ts:335](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L335)

Payload delivered to onChunk callbacks for each streaming chunk.

## Properties

### type

> **type**: `string`

Defined in: [types/middleware.ts:337](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L337)

Chunk type from the AI SDK stream

---

### textDelta?

> `optional` **textDelta?**: `string`

Defined in: [types/middleware.ts:339](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L339)

Text content for text-delta chunks

---

### sequenceNumber

> **sequenceNumber**: `number`

Defined in: [types/middleware.ts:341](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L341)

Zero-based chunk sequence number
