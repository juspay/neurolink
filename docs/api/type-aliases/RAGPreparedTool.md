[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPreparedTool

# Type Alias: RAGPreparedTool

> **RAGPreparedTool** = `object`

Defined in: [types/rag.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L680)

Prepared RAG tool ready for injection into generate/stream.

## Properties

### tool

> **tool**: `Tool`

Defined in: [types/rag.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L682)

The tool to inject into the tools Record

---

### toolName

> **toolName**: `string`

Defined in: [types/rag.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L684)

Tool name (key for the tools Record)

---

### chunksIndexed

> **chunksIndexed**: `number`

Defined in: [types/rag.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L686)

Number of chunks indexed

---

### filesLoaded

> **filesLoaded**: `number`

Defined in: [types/rag.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L688)

Number of files loaded
