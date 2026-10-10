[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / prepareRAGTool

# Function: prepareRAGTool()

> **prepareRAGTool**(`ragConfig`, `fallbackProvider?`): `Promise`\<[`RAGPreparedTool`](../type-aliases/RAGPreparedTool.md)\>

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

## Throws

When `files` is empty, when no source can be loaded, and when the
built-in hash embedding is given a chunk longer than 1,048,576 characters (it
is the default, and the fallback when a configured embedding provider fails).
The returned tool rejects a query over the same length the same way.
