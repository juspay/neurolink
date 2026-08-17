[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextWindow

# Type Alias: ContextWindow

> **ContextWindow** = `object`

Defined in: [types/rag.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L69)

Context window representation

## Properties

### text

> **text**: `string`

Defined in: [types/rag.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L71)

Assembled context text

---

### chunkCount

> **chunkCount**: `number`

Defined in: [types/rag.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L73)

Number of chunks included

---

### charCount

> **charCount**: `number`

Defined in: [types/rag.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L75)

Total character count

---

### tokenCount

> **tokenCount**: `number`

Defined in: [types/rag.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L77)

Estimated token count

---

### truncatedChunks

> **truncatedChunks**: `number`

Defined in: [types/rag.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L79)

Chunks that were truncated/excluded

---

### citations

> **citations**: `Map`\<`string`, `string`\>

Defined in: [types/rag.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L81)

Citation map (id -> citation text)
