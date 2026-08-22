[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResponse

# Type Alias: VectorQueryResponse

> **VectorQueryResponse** = `object`

Defined in: [types/rag.ts:1264](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1264)

Vector query result wrapper

## Properties

### relevantContext

> **relevantContext**: `string`

Defined in: [types/rag.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1266)

Formatted relevant context string

---

### sources

> **sources**: [`VectorQueryResult`](VectorQueryResult.md)[]

Defined in: [types/rag.ts:1268](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1268)

Source query results

---

### totalResults

> **totalResults**: `number`

Defined in: [types/rag.ts:1270](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1270)

Total results found

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1272)

Query metadata

#### queryTime

> **queryTime**: `number`

#### reranked

> **reranked**: `boolean`

#### filtered

> **filtered**: `boolean`
