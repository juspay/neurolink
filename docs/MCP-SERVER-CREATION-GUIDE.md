# MCP Server Creation Guide - Official SDK v1.13.0

## The Problem with the Original test-mcp-server.mjs

The original `test-mcp-server.mjs` was using the **old SDK pattern** that's no longer compatible with `@modelcontextprotocol/sdk` v1.13.0:

```javascript
// ❌ OLD PATTERN - CAUSES ERRORS
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({...});
server.setRequestHandler("tools/list", async () => {...});  // This breaks
```

The error `Cannot read properties of undefined (reading 'method')` occurs because the modern SDK changed its internal request handling structure.

## ✅ CORRECT Pattern for Custom MCP Servers

### 1. Basic Server Setup

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create server with McpServer class (not Server)
const server = new McpServer(
  {
    name: "your-server-name",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

### 2. Tool Registration with .tool() Method

```javascript
// Simple tool with no parameters
server.tool(
  'ping',
  'Simple ping tool',
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "pong"
        }
      ]
    };
  }
);

// Tool with parameters and validation
server.tool(
  'greet',
  'Greets a user by name',
  {
    name: z.string().describe('Name to greet')
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${name}!`
        }
      ]
    };
  }
);
```

### 3. Advanced Parameter Validation

```javascript
server.tool(
  'calculate',
  'Performs calculations',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Math operation'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
    precision: z.number().min(0).max(10).default(2).describe('Decimal precision')
  },
  async ({ operation, a, b, precision }) => {
    // Implementation here
  }
);
```

### 4. Error Handling

```javascript
server.tool(
  'divide',
  'Divides two numbers',
  {
    dividend: z.number(),
    divisor: z.number()
  },
  async ({ dividend, divisor }) => {
    if (divisor === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Cannot divide by zero"
          }
        ],
        isError: true  // Mark as error
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: `Result: ${dividend / divisor}`
        }
      ]
    };
  }
);
```

### 5. Server Startup

```javascript
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server started successfully");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
```

## Configuration in .neuro.config.json

```json
{
  "mcpServers": {
    "your-server": {
      "name": "your-server",
      "command": "node",
      "args": ["./your-mcp-server.mjs"],
      "transport": "stdio",
      "description": "Your custom MCP server",
      "enabled": true
    }
  }
}
```

## Key Differences from Old Pattern

| Old Pattern (❌ Broken) | New Pattern (✅ Working) |
|-------------------------|--------------------------|
| `import { Server }` | `import { McpServer }` |
| `setRequestHandler("tools/list", ...)` | `server.tool(name, description, schema, callback)` |
| `setRequestHandler("tools/call", ...)` | Automatic handling via `.tool()` |
| Manual request parsing | Automatic validation with Zod schemas |
| Complex response formatting | Simple return `{ content: [...] }` |

## Working Examples

1. **Basic Test Server**: `/test-mcp-server-fixed.mjs`
2. **Comprehensive Patterns**: `/examples/mcp-server-patterns.mjs`
3. **Internal Server Examples**: `/src/lib/mcp/servers/ai-providers/ai-core-server.ts`

## Testing Your Server

```bash
# Test server startup
node your-mcp-server.mjs

# Should output: "MCP Server started successfully"
# No errors about "Cannot read properties of undefined"

# Test via neurolink CLI
npx neurolink mcp list
npx neurolink mcp test your-server
```

## Common Mistakes to Avoid

1. **Don't use the old `Server` class** - use `McpServer`
2. **Don't use `setRequestHandler`** - use `.tool()` method
3. **Don't manually parse requests** - let the SDK handle it
4. **Don't forget Zod validation** - always define parameter schemas
5. **Don't use relative imports** - use the official SDK paths

## Parameter Schema Examples

```javascript
// String with validation
name: z.string().min(1).max(100).describe('User name')

// Number with constraints  
age: z.number().min(0).max(150).describe('Age in years')

// Optional parameter
email: z.string().email().optional().describe('Email address')

// Enum values
priority: z.enum(['low', 'medium', 'high']).describe('Task priority')

// Array of strings
tags: z.array(z.string()).describe('List of tags')

// Complex object
user: z.object({
  name: z.string(),
  email: z.string().email()
}).describe('User information')

// Default values
timeout: z.number().default(1000).describe('Timeout in milliseconds')
```

This guide should help you create working MCP servers that integrate properly with the NeuroLink ecosystem.