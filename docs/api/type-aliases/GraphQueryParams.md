[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphQueryParams

# Type Alias: GraphQueryParams

> **GraphQueryParams** = `object`

Defined in: [types/rag.ts:1415](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1415)

Graph query parameters

## Properties

### query

> **query**: `number`[]

Defined in: [types/rag.ts:1417](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1417)

Query embedding vector

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1419](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1419)

Number of results to return (default: 10)

---

### randomWalkSteps?

> `optional` **randomWalkSteps?**: `number`

Defined in: [types/rag.ts:1421](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1421)

Random walk steps (default: 100)

---

### restartProb?

> `optional` **restartProb?**: `number`

Defined in: [types/rag.ts:1423](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1423)

Restart probability for random walk (default: 0.15)
