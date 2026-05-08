[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResponse

# Type Alias: VectorQueryResponse

> **VectorQueryResponse** = `object`

Defined in: [types/rag.ts:1220](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1220)

Vector query result wrapper

## Properties

### relevantContext

> **relevantContext**: `string`

Defined in: [types/rag.ts:1222](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1222)

Formatted relevant context string

---

### sources

> **sources**: [`VectorQueryResult`](VectorQueryResult.md)[]

Defined in: [types/rag.ts:1224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1224)

Source query results

---

### totalResults

> **totalResults**: `number`

Defined in: [types/rag.ts:1226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1226)

Total results found

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1228)

Query metadata

#### queryTime

> **queryTime**: `number`

#### reranked

> **reranked**: `boolean`

#### filtered

> **filtered**: `boolean`
