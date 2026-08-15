[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / mcpProtocolToolToServerTool

# Function: mcpProtocolToolToServerTool()

> **mcpProtocolToolToServerTool**(`protocolTool`, `executor`, `options?`): [`MCPServerTool`](../type-aliases/MCPServerTool.md)

Defined in: [mcp/toolConverter.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/toolConverter.ts#L125)

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
