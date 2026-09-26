[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpProtocolToolToServerTool

# Function: mcpProtocolToolToServerTool()

> **mcpProtocolToolToServerTool**(`protocolTool`, `executor`, `options?`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

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
