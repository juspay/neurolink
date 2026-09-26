[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResponse

# Type Alias: VectorQueryResponse

> **VectorQueryResponse** = `object`

Vector query result wrapper

## Properties

### relevantContext

> **relevantContext**: `string`

Formatted relevant context string

---

### sources

> **sources**: [`VectorQueryResult`](VectorQueryResult.md)[]

Source query results

---

### totalResults

> **totalResults**: `number`

Total results found

---

### metadata

> **metadata**: `object`

Query metadata

#### queryTime

> **queryTime**: `number`

#### reranked

> **reranked**: `boolean`

#### filtered

> **filtered**: `boolean`
