[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolMiddleware

# Type Alias: ToolMiddleware

> **ToolMiddleware** = (`tool`, `params`, `context`, `next`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

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
