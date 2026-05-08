[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankResult

# Type Alias: RerankResult

> **RerankResult** = `object`

Defined in: [types/rag.ts:1419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1419)

Reranked result with detailed scoring

## Properties

### result

> **result**: [`VectorQueryResult`](VectorQueryResult.md)

Defined in: [types/rag.ts:1421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1421)

Original query result

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1423)

Combined reranking score (0-1)

---

### details

> **details**: `object`

Defined in: [types/rag.ts:1425](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1425)

Detailed score breakdown

#### semantic

> **semantic**: `number`

#### vector

> **vector**: `number`

#### position

> **position**: `number`

#### queryAnalysis?

> `optional` **queryAnalysis?**: `string`
