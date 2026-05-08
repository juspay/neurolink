[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpProtocolToolToServerTool

# Function: mcpProtocolToolToServerTool()

> **mcpProtocolToolToServerTool**(`protocolTool`, `executor`, `options?`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/toolConverter.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/toolConverter.ts#L125)

Convert MCP protocol tool to MCPServerTool
(For tools received from external MCP servers)

## Parameters

### protocolTool

[`MCPProtocolTool`](../type-aliases/MCPProtocolTool.md)

### executor

(`params`, `context?`) => `Promise`\<`unknown`\>

### options?

[`ToolConverterOptions`](../type-aliases/ToolConverterOptions.md) = `{}`

## Returns

[`MCPServerTool`](../type-aliases/MCPServerTool.md)
