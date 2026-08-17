[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphQueryParams

# Type Alias: GraphQueryParams

> **GraphQueryParams** = `object`

Defined in: [types/rag.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1434)

Graph query parameters

## Properties

### query

> **query**: `number`[]

Defined in: [types/rag.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1436)

Query embedding vector

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1438](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1438)

Number of results to return (default: 10)

---

### randomWalkSteps?

> `optional` **randomWalkSteps?**: `number`

Defined in: [types/rag.ts:1440](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1440)

Random walk steps (default: 100)

---

### restartProb?

> `optional` **restartProb?**: `number`

Defined in: [types/rag.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1442)

Restart probability for random walk (default: 0.15)
