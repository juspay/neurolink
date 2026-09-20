[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalItem

# Type Alias: ToolRetrievalItem

> **ToolRetrievalItem** = `object`

Defined in: [types/toolRouting.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L400)

A single item in the tool retrieval catalog, pairing a tool name with the
text (tool description + server context) used to build its embedding vector.

## Properties

### name

> **name**: `string`

Defined in: [types/toolRouting.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L402)

Fully-qualified tool name (e.g. `${serverId}_${toolName}`).

---

### text

> **text**: `string`

Defined in: [types/toolRouting.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L404)

Descriptive text used as the embedding document for this tool.
