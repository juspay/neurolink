#!/usr/bin/env node

/**
 * Example MCP Server for NeuroLink
 * Uses the modern @modelcontextprotocol/sdk v1.13.0 API
 * Provides example tools for testing and learning MCP integration
 *
 * This server demonstrates:
 * - Basic tool registration with Zod validation
 * - Error handling in MCP tools
 * - Different parameter types and validation
 * - Modern MCP SDK patterns
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Create the MCP server using the modern McpServer class
const server = new McpServer(
  {
    name: "example-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register test_hello tool using the modern .tool() method
server.tool(
  'test_hello',
  'Returns a hello message with the provided name',
  {
    name: z.string().describe('Name to greet')
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${name}! This message is from the example MCP server configured in .neuro.config.json. 🎉 wow`
        }
      ]
    };
  }
);

// Register test_math tool
server.tool(
  'test_math',
  'Performs basic math operations',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Math operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number')
  },
  async ({ operation, a, b }) => {
    let result;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Division by zero is not allowed"
              }
            ],
            isError: true
          };
        }
        result = a / b;
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown operation "${operation}"`
            }
          ],
          isError: true
        };
    }

    return {
      content: [
        {
          type: "text",
          text: `Math result: ${a} ${operation} ${b} = ${result}`
        }
      ]
    };
  }
);

// Register test_timestamp tool
server.tool(
  'test_timestamp',
  'Returns current timestamp and formatted date',
  {
    format: z.enum(['iso', 'local', 'timestamp']).optional().describe('Date format (iso, local, or timestamp)')
  },
  async ({ format = 'iso' }) => {
    const now = new Date();
    let timeResult;

    switch (format) {
      case "iso":
        timeResult = now.toISOString();
        break;
      case "local":
        timeResult = now.toLocaleString();
        break;
      case "timestamp":
        timeResult = now.getTime().toString();
        break;
      default:
        timeResult = now.toISOString();
    }

    return {
      content: [
        {
          type: "text",
          text: `Current time (${format}): ${timeResult}`
        }
      ]
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Example MCP Server started successfully");
}

main().catch((error) => {
  console.error("Failed to start example MCP server:", error);
  process.exit(1);
});
