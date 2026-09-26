[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPreparedTool

# Type Alias: RAGPreparedTool

> **RAGPreparedTool** = `object`

Prepared RAG tool ready for injection into generate/stream.

## Properties

### tool

> **tool**: [`Tool`](Tool.md)

The tool to inject into the tools Record

---

### toolName

> **toolName**: `string`

Tool name (key for the tools Record)

---

### chunksIndexed

> **chunksIndexed**: `number`

Number of chunks indexed

---

### filesLoaded

> **filesLoaded**: `number`

Number of files loaded
