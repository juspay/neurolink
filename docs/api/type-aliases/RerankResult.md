[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankResult

# Type Alias: RerankResult

> **RerankResult** = `object`

Defined in: [types/rag.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1463)

Reranked result with detailed scoring

## Properties

### result

> **result**: [`VectorQueryResult`](VectorQueryResult.md)

Defined in: [types/rag.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1465)

Original query result

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1467)

Combined reranking score (0-1)

---

### details

> **details**: `object`

Defined in: [types/rag.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1469)

Detailed score breakdown

#### semantic

> **semantic**: `number`

#### vector

> **vector**: `number`

#### position

> **position**: `number`

#### queryAnalysis?

> `optional` **queryAnalysis?**: `string`
