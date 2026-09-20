[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankResult

# Type Alias: RerankResult

> **RerankResult** = `object`

Defined in: [types/rag.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1501)

Reranked result with detailed scoring

## Properties

### result

> **result**: [`VectorQueryResult`](VectorQueryResult.md)

Defined in: [types/rag.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1503)

Original query result

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1505)

Combined reranking score (0-1)

---

### details

> **details**: `object`

Defined in: [types/rag.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1507)

Detailed score breakdown

#### semantic

> **semantic**: `number`

#### vector

> **vector**: `number`

#### position

> **position**: `number`

#### queryAnalysis?

> `optional` **queryAnalysis?**: `string`
