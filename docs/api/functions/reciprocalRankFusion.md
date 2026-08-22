[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / reciprocalRankFusion

# Function: reciprocalRankFusion()

> **reciprocalRankFusion**(`rankings`, `k?`): `Map`\<`string`, `number`\>

Defined in: [rag/retrieval/hybridSearch.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/rag/retrieval/hybridSearch.ts#L151)

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
