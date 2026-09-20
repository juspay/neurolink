[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResponse

# Type Alias: VectorQueryResponse

> **VectorQueryResponse** = `object`

Defined in: [types/rag.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1302)

Vector query result wrapper

## Properties

### relevantContext

> **relevantContext**: `string`

Defined in: [types/rag.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1304)

Formatted relevant context string

---

### sources

> **sources**: [`VectorQueryResult`](VectorQueryResult.md)[]

Defined in: [types/rag.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1306)

Source query results

---

### totalResults

> **totalResults**: `number`

Defined in: [types/rag.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1308)

Total results found

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1310)

Query metadata

#### queryTime

> **queryTime**: `number`

#### reranked

> **reranked**: `boolean`

#### filtered

> **filtered**: `boolean`
