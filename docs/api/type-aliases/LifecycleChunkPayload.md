[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleChunkPayload

# Type Alias: LifecycleChunkPayload

> **LifecycleChunkPayload** = `object`

Payload delivered to onChunk callbacks for each streaming chunk.

## Properties

### type

> **type**: `string`

Chunk type from the AI SDK stream

---

### textDelta?

> `optional` **textDelta?**: `string`

Text content for text-delta chunks

---

### sequenceNumber

> **sequenceNumber**: `number`

Zero-based chunk sequence number
