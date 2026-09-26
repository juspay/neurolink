[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalItem

# Type Alias: ToolRetrievalItem

> **ToolRetrievalItem** = `object`

A single item in the tool retrieval catalog, pairing a tool name with the
text (tool description + server context) used to build its embedding vector.

## Properties

### name

> **name**: `string`

Fully-qualified tool name (e.g. `${serverId}_${toolName}`).

---

### text

> **text**: `string`

Descriptive text used as the embedding document for this tool.
