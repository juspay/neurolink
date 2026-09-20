[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPreparedTool

# Type Alias: RAGPreparedTool

> **RAGPreparedTool** = `object`

Defined in: [types/rag.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L699)

Prepared RAG tool ready for injection into generate/stream.

## Properties

### tool

> **tool**: [`Tool`](Tool.md)

Defined in: [types/rag.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L701)

The tool to inject into the tools Record

---

### toolName

> **toolName**: `string`

Defined in: [types/rag.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L703)

Tool name (key for the tools Record)

---

### chunksIndexed

> **chunksIndexed**: `number`

Defined in: [types/rag.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L705)

Number of chunks indexed

---

### filesLoaded

> **filesLoaded**: `number`

Defined in: [types/rag.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L707)

Number of files loaded
