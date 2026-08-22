[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolMiddleware

# Type Alias: ToolMiddleware

> **ToolMiddleware** = (`tool`, `params`, `context`, `next`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2267](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2267)

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
