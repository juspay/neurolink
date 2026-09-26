[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankResult

# Type Alias: RerankResult

> **RerankResult** = `object`

Reranked result with detailed scoring

## Properties

### result

> **result**: [`VectorQueryResult`](VectorQueryResult.md)

Original query result

---

### score

> **score**: `number`

Combined reranking score (0-1)

---

### details

> **details**: `object`

Detailed score breakdown

#### semantic

> **semantic**: `number`

#### vector

> **vector**: `number`

#### position

> **position**: `number`

#### queryAnalysis?

> `optional` **queryAnalysis?**: `string`
