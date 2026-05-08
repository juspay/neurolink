[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / prepareRAGTool

# Function: prepareRAGTool()

> **prepareRAGTool**(`ragConfig`, `fallbackProvider?`): `Promise`\<[`RAGPreparedTool`](../type-aliases/RAGPreparedTool.md)\>

Defined in: [rag/ragIntegration.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/ragIntegration.ts#L189)

Prepare RAG tools from the provided configuration.

This function:

1. Loads and reads all specified files
2. Chunks them using the configured (or auto-detected) strategy
3. Generates embeddings for each chunk
4. Stores them in an in-memory vector store
5. Creates a tool the AI model can use to search the documents

## Parameters

### ragConfig

[`RAGConfig`](../type-aliases/RAGConfig.md)

RAG configuration from generate/stream options

### fallbackProvider?

`string`

Provider to use for embeddings if not specified in ragConfig

## Returns

`Promise`\<[`RAGPreparedTool`](../type-aliases/RAGPreparedTool.md)\>

Prepared RAG tool to inject into the tools record
