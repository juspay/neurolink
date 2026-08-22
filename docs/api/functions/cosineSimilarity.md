[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / cosineSimilarity

# Function: cosineSimilarity()

> **cosineSimilarity**(`a`, `b`): `number`

Defined in: [core/toolRoutingEmbedding.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/core/toolRoutingEmbedding.ts#L72)

Cosine similarity between two vectors.

Returns 0 when either vector is zero-length, has zero magnitude, or the
lengths differ — all of which indicate the comparison is meaningless.

## Parameters

### a

`number`[]

### b

`number`[]

## Returns

`number`
