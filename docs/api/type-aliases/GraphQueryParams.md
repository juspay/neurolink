[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphQueryParams

# Type Alias: GraphQueryParams

> **GraphQueryParams** = `object`

Defined in: [types/rag.ts:1371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1371)

Graph query parameters

## Properties

### query

> **query**: `number`[]

Defined in: [types/rag.ts:1373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1373)

Query embedding vector

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1375)

Number of results to return (default: 10)

---

### randomWalkSteps?

> `optional` **randomWalkSteps?**: `number`

Defined in: [types/rag.ts:1377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1377)

Random walk steps (default: 100)

---

### restartProb?

> `optional` **restartProb?**: `number`

Defined in: [types/rag.ts:1379](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1379)

Restart probability for random walk (default: 0.15)
