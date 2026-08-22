[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / inferAnnotations

# Function: inferAnnotations()

> **inferAnnotations**(`tool`): [`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md)

Defined in: [mcp/toolAnnotations.ts:23](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/toolAnnotations.ts#L23)

Infer annotations from tool definition
Uses heuristics based on tool description and name

## Parameters

### tool

`Pick`\<[`MCPServerTool`](../type-aliases/MCPServerTool.md), `"name"` \| `"description"`\>

## Returns

[`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md)
