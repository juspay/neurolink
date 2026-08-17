[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResponse

# Type Alias: VectorQueryResponse

> **VectorQueryResponse** = `object`

Defined in: [types/rag.ts:1283](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1283)

Vector query result wrapper

## Properties

### relevantContext

> **relevantContext**: `string`

Defined in: [types/rag.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1285)

Formatted relevant context string

---

### sources

> **sources**: [`VectorQueryResult`](VectorQueryResult.md)[]

Defined in: [types/rag.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1287)

Source query results

---

### totalResults

> **totalResults**: `number`

Defined in: [types/rag.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1289)

Total results found

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1291)

Query metadata

#### queryTime

> **queryTime**: `number`

#### reranked

> **reranked**: `boolean`

#### filtered

> **filtered**: `boolean`
