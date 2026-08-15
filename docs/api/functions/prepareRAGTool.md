[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / prepareRAGTool

# Function: prepareRAGTool()

> **prepareRAGTool**(`ragConfig`, `fallbackProvider?`): `Promise`\<[`RAGPreparedTool`](../type-aliases/RAGPreparedTool.md)\>

Defined in: [rag/ragIntegration.ts:181](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/ragIntegration.ts#L181)

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
