[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPreparedTool

# Type Alias: RAGPreparedTool

> **RAGPreparedTool** = `object`

Defined in: [types/rag.ts:617](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L617)

Prepared RAG tool ready for injection into generate/stream.

## Properties

### tool

> **tool**: `Tool`

Defined in: [types/rag.ts:619](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L619)

The tool to inject into the tools Record

---

### toolName

> **toolName**: `string`

Defined in: [types/rag.ts:621](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L621)

Tool name (key for the tools Record)

---

### chunksIndexed

> **chunksIndexed**: `number`

Defined in: [types/rag.ts:623](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L623)

Number of chunks indexed

---

### filesLoaded

> **filesLoaded**: `number`

Defined in: [types/rag.ts:625](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L625)

Number of files loaded
