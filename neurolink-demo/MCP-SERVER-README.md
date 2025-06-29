# Example MCP Server

This directory contains a working example MCP server that demonstrates how to create custom MCP servers for NeuroLink using the official Model Context Protocol SDK.

## Files

- **`example-mcp-server.mjs`** - A complete example MCP server with multiple tools
- **`MCP-SERVER-README.md`** - This documentation file

## About the Example Server

The example server demonstrates:

- ✅ **Modern MCP SDK v1.13.0** - Uses the official `@modelcontextprotocol/sdk`
- ✅ **Tool Registration** - Shows how to register tools with the `.tool()` method
- ✅ **Zod Validation** - Parameter validation using Zod schemas
- ✅ **Error Handling** - Proper error responses and validation
- ✅ **Multiple Tool Types** - Different parameter types and return formats

## Available Tools

### 1. `test_hello`
- **Purpose**: Simple greeting tool
- **Parameters**: `name` (string) - Name to greet
- **Example**: Returns "Hello, John! This message is from the example MCP server..."

### 2. `test_math`
- **Purpose**: Basic math operations
- **Parameters**: 
  - `operation` (enum) - add, subtract, multiply, divide
  - `a` (number) - First number
  - `b` (number) - Second number
- **Example**: Performs calculations and returns formatted results

### 3. `test_timestamp`
- **Purpose**: Current time and date information
- **Parameters**: `format` (optional enum) - iso, local, or timestamp
- **Example**: Returns current time in specified format

## Configuration

The server is configured in `.neuro.config.json`:

```json
{
  "mcpServers": {
    "example-server": {
      "name": "example-server",
      "command": "node",
      "args": ["./neurolink-demo/example-mcp-server.mjs"],
      "transport": "stdio",
      "description": "Example MCP server demonstrating modern SDK v1.13.0 patterns",
      "enabled": true
    }
  }
}
```

## Testing the Server

### Quick Test Command
```bash
node dist/cli/index.js generate-text "Say hello to everyone using the example server" --provider google-ai
```

### Math Test Command  
```bash
node dist/cli/index.js generate-text "Calculate 15 + 27 using the example server" --provider google-ai
```

### Time Test Command
```bash
node dist/cli/index.js generate-text "What's the current time? Use the example server" --provider google-ai
```

## Creating Your Own MCP Server

Use this example as a template:

1. **Copy the file**: `cp neurolink-demo/example-mcp-server.mjs my-custom-server.mjs`
2. **Modify tools**: Add your custom tools using the same patterns
3. **Update config**: Add your server to `.neuro.config.json`
4. **Test**: Use the CLI commands to verify functionality

## Key Patterns

### Tool Registration
```javascript
server.tool(
  'tool_name',
  'Tool description',
  {
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter')
  },
  async ({ param1, param2 }) => {
    return {
      content: [
        {
          type: "text",
          text: "Tool response"
        }
      ]
    };
  }
);
```

### Error Handling
```javascript
if (errorCondition) {
  return {
    content: [
      {
        type: "text",
        text: "Error: Description of the error"
      }
    ],
    isError: true
  };
}
```

## Dependencies

The example server requires:
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `zod` - Parameter validation

These are included in NeuroLink's dependencies, so no additional installation is needed.

## Next Steps

- Explore the [MCP SDK documentation](https://modelcontextprotocol.io/docs)
- Check out more MCP servers in the [official repository](https://github.com/modelcontextprotocol/servers)
- Review NeuroLink's [MCP Integration Guide](../docs/MCP-INTEGRATION.md)