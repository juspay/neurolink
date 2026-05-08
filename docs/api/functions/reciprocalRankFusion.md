[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / reciprocalRankFusion

# Function: reciprocalRankFusion()

> **reciprocalRankFusion**(`rankings`, `k?`): `Map`\<`string`, `number`\>

Defined in: [rag/retrieval/hybridSearch.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/hybridSearch.ts#L151)

Reciprocal Rank Fusion
Combines rankings from multiple retrieval methods

## Parameters

### rankings

`object`[][]

Array of ranking lists, each with id and rank

### k?

`number` = `60`

RRF constant (default: 60)

## Returns

`Map`\<`string`, `number`\>

Map of document IDs to fused scores
