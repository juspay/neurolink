[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolMiddleware

# Type Alias: ToolMiddleware

> **ToolMiddleware** = (`tool`, `params`, `context`, `next`) => `Promise`\<[`ToolResult`](ToolResult.md) \| `unknown`\>

Defined in: [types/mcp.ts:2267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2267)

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
