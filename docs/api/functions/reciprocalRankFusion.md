[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / reciprocalRankFusion

# Function: reciprocalRankFusion()

> **reciprocalRankFusion**(`rankings`, `k?`): `Map`\<`string`, `number`\>

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
