[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphQueryParams

# Type Alias: GraphQueryParams

> **GraphQueryParams** = `object`

Defined in: [types/rag.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1453)

Graph query parameters

## Properties

### query

> **query**: `number`[]

Defined in: [types/rag.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1455)

Query embedding vector

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1457)

Number of results to return (default: 10)

---

### randomWalkSteps?

> `optional` **randomWalkSteps?**: `number`

Defined in: [types/rag.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1459)

Random walk steps (default: 100)

---

### restartProb?

> `optional` **restartProb?**: `number`

Defined in: [types/rag.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1461)

Restart probability for random walk (default: 0.15)
