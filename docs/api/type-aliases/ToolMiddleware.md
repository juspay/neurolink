[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolMiddleware

# Type Alias: ToolMiddleware

> **ToolMiddleware** = (`tool`, `params`, `context`, `next`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2286)

Tool execution middleware

## Parameters

### tool

[`MCPServerTool`](MCPServerTool.md)

### params

`unknown`

### context

[`EnhancedExecutionContext`](EnhancedExecutionContext.md)

### next

() => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

## Returns

`Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>
