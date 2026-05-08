[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / linearCombination

# Function: linearCombination()

> **linearCombination**(`vectorScores`, `bm25Scores`, `alpha?`): `Map`\<`string`, `number`\>

Defined in: [rag/retrieval/hybridSearch.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/hybridSearch.ts#L175)

Linear Combination of normalized scores

## Parameters

### vectorScores

`Map`\<`string`, `number`\>

Vector search scores

### bm25Scores

`Map`\<`string`, `number`\>

BM25 search scores

### alpha?

`number` = `0.5`

Weight for vector scores (0-1), bm25 gets 1-alpha

## Returns

`Map`\<`string`, `number`\>

Map of document IDs to combined scores
