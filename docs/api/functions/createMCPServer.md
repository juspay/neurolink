[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMCPServer

# Function: createMCPServer()

> **createMCPServer**(`config`): [`NeuroLinkMCPServer`](../type-aliases/NeuroLinkMCPServer.md)

Defined in: [mcp/factory.ts:76](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/factory.ts#L76)

Create MCP Server Factory Function

Core factory function for creating MCP servers.
Follows Factory-First architecture where tools are internal implementation.

## Parameters

### config

[`MCPServerConfig`](../type-aliases/MCPServerConfig.md)

Server configuration with minimal required fields

## Returns

[`NeuroLinkMCPServer`](../type-aliases/NeuroLinkMCPServer.md)

Fully configured MCP server ready for tool registration

## Example

```typescript
const aiCoreServer = createMCPServer({
  id: "neurolink-ai-core",
  title: "NeuroLink AI Core",
  description: "Core AI provider tools",
  category: "aiProviders",
});

aiCoreServer.registerTool({
  name: "generate",
  description: "Generate text using AI providers",
  execute: async (params, context) => {
    // Tool implementation
    return { success: true, data: result };
  },
});
```
