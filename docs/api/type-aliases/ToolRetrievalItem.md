[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalItem

# Type Alias: ToolRetrievalItem

> **ToolRetrievalItem** = `object`

Defined in: [types/toolRouting.ts:363](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L363)

A single item in the tool retrieval catalog, pairing a tool name with the
text (tool description + server context) used to build its embedding vector.

## Properties

### name

> **name**: `string`

Defined in: [types/toolRouting.ts:365](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L365)

Fully-qualified tool name (e.g. `${serverId}_${toolName}`).

---

### text

> **text**: `string`

Defined in: [types/toolRouting.ts:367](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L367)

Descriptive text used as the embedding document for this tool.
