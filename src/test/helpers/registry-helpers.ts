/**
 * Backward compatibility helpers for test registry usage
 * Provides simple register methods for test tools
 */

import type { MCPToolRegistry } from "../../lib/mcp/tool-registry.js";

// Helper to register individual tools for testing
export const registerTestTool = async (
  registry: MCPToolRegistry,
  toolName: string,
  toolDef: any,
): Promise<void> => {
  const serverId = `test-server-${toolName}`;

  await registry.registerServer(serverId, {
    tools: {
      [toolName]: {
        name: toolName,
        description: toolDef.description || "Test tool",
        inputSchema: toolDef.inputSchema || { type: "object" },
        execute: toolDef.execute,
        ...toolDef,
      },
    },
  });
};

// Helper to register multiple tools at once
export const registerTestTools = async (
  registry: MCPToolRegistry,
  tools: Record<string, any>,
): Promise<void> => {
  await registry.registerServer("test-server-batch", {
    tools: Object.fromEntries(
      Object.entries(tools).map(([name, def]) => [
        name,
        {
          name,
          description: def.description || "Test tool",
          inputSchema: def.inputSchema || { type: "object" },
          execute: def.execute,
          ...def,
        },
      ]),
    ),
  });
};
