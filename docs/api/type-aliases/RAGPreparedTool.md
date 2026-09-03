[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPreparedTool

# Type Alias: RAGPreparedTool

> **RAGPreparedTool** = `object`

Defined in: [types/rag.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L661)

Prepared RAG tool ready for injection into generate/stream.

## Properties

### tool

> **tool**: [`Tool`](Tool.md)

Defined in: [types/rag.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L663)

The tool to inject into the tools Record

---

### toolName

> **toolName**: `string`

Defined in: [types/rag.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L665)

Tool name (key for the tools Record)

---

### chunksIndexed

> **chunksIndexed**: `number`

Defined in: [types/rag.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L667)

Number of chunks indexed

---

### filesLoaded

> **filesLoaded**: `number`

Defined in: [types/rag.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L669)

Number of files loaded
