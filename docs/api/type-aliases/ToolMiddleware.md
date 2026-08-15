[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolMiddleware

# Type Alias: ToolMiddleware

> **ToolMiddleware** = (`tool`, `params`, `context`, `next`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2267](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L2267)

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
