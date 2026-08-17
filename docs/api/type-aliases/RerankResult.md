[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankResult

# Type Alias: RerankResult

> **RerankResult** = `object`

Defined in: [types/rag.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1482)

Reranked result with detailed scoring

## Properties

### result

> **result**: [`VectorQueryResult`](VectorQueryResult.md)

Defined in: [types/rag.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1484)

Original query result

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1486)

Combined reranking score (0-1)

---

### details

> **details**: `object`

Defined in: [types/rag.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1488)

Detailed score breakdown

#### semantic

> **semantic**: `number`

#### vector

> **vector**: `number`

#### position

> **position**: `number`

#### queryAnalysis?

> `optional` **queryAnalysis?**: `string`
