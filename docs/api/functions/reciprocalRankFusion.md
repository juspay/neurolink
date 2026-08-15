[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / reciprocalRankFusion

# Function: reciprocalRankFusion()

> **reciprocalRankFusion**(`rankings`, `k?`): `Map`\<`string`, `number`\>

Defined in: [rag/retrieval/hybridSearch.ts:151](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/retrieval/hybridSearch.ts#L151)

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
