[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextWindow

# Type Alias: ContextWindow

> **ContextWindow** = `object`

Defined in: [types/rag.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L66)

Context window representation

## Properties

### text

> **text**: `string`

Defined in: [types/rag.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L68)

Assembled context text

---

### chunkCount

> **chunkCount**: `number`

Defined in: [types/rag.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L70)

Number of chunks included

---

### charCount

> **charCount**: `number`

Defined in: [types/rag.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L72)

Total character count

---

### tokenCount

> **tokenCount**: `number`

Defined in: [types/rag.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L74)

Estimated token count

---

### truncatedChunks

> **truncatedChunks**: `number`

Defined in: [types/rag.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L76)

Chunks that were truncated/excluded

---

### citations

> **citations**: `Map`\<`string`, `string`\>

Defined in: [types/rag.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L78)

Citation map (id -> citation text)
