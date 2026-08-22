[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextWindow

# Type Alias: ContextWindow

> **ContextWindow** = `object`

Defined in: [types/rag.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L68)

Context window representation

## Properties

### text

> **text**: `string`

Defined in: [types/rag.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L70)

Assembled context text

---

### chunkCount

> **chunkCount**: `number`

Defined in: [types/rag.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L72)

Number of chunks included

---

### charCount

> **charCount**: `number`

Defined in: [types/rag.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L74)

Total character count

---

### tokenCount

> **tokenCount**: `number`

Defined in: [types/rag.ts:76](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L76)

Estimated token count

---

### truncatedChunks

> **truncatedChunks**: `number`

Defined in: [types/rag.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L78)

Chunks that were truncated/excluded

---

### citations

> **citations**: `Map`\<`string`, `string`\>

Defined in: [types/rag.ts:80](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L80)

Citation map (id -> citation text)
