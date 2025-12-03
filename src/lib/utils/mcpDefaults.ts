/**
 * Smart Defaults for MCPServerInfo Creation
 * Eliminates boilerplate manual object creation
 */

import type {
  MCPServerInfo,
  MCPExecutableTool,
  MCPServerCategory,
  MCPServerConnectionStatus,
} from "../types/mcpTypes.js";

/**
 * Smart category detection based on context
 */
export function detectCategory(context: {
  isCustomTool?: boolean;
  isExternal?: boolean;
  isBuiltIn?: boolean;
  serverId?: string;
  existingCategory?: string;
}): MCPServerCategory {
  // If category is already provided, validate and use it
  if (context.existingCategory) {
    const validCategories: MCPServerCategory[] = [
      "external",
      "in-memory",
      "built-in",
      "user-defined",
    ];
    if (
      validCategories.includes(context.existingCategory as MCPServerCategory)
    ) {
      return context.existingCategory as MCPServerCategory;
    }
  }

  // Smart detection based on context
  if (context.isCustomTool) {
    return "user-defined" as MCPServerCategory;
  }
  if (context.isBuiltIn) {
    return "built-in" as MCPServerCategory;
  }
  if (context.isExternal) {
    return "external" as MCPServerCategory;
  }
  if (context.serverId?.startsWith("custom-tool-")) {
    return "user-defined" as MCPServerCategory;
  }
  if (context.serverId?.includes("external")) {
    return "external" as MCPServerCategory;
  }
  if (context.serverId === "direct") {
    return "built-in" as MCPServerCategory;
  }

  // Default to in-memory for most cases
  return "in-memory" as MCPServerCategory;
}

/**
 * Generate smart description based on name and category
 */
function generateDescription(name: string, category: string): string {
  // Generate descriptions based on category for better context
  switch (category) {
    case "external":
      return `External MCP server: ${name}`;
    case "built-in":
      return `Built-in tool server: ${name}`;
    case "custom":
    case "user-defined":
      return `Custom tool server: ${name}`;
    case "in-memory":
      return `In-memory MCP server: ${name}`;
    default:
      return name;
  }
}

/**
 * Create MCPServerInfo with smart defaults
 * Eliminates manual boilerplate object creation
 */
export function createMCPServerInfo(options: {
  id?: string;
  name: string;
  tool?: MCPExecutableTool;
  tools?: MCPServerInfo["tools"];
  transport?: MCPServerInfo["transport"];
  status?: MCPServerInfo["status"];
  description?: string;
  category?: string;
  isCustomTool?: boolean;
  isExternal?: boolean;
  isBuiltIn?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}): MCPServerInfo {
  const id = options.id || `server-${options.name}`;
  const category =
    options.category ||
    detectCategory({
      isCustomTool: options.isCustomTool,
      isExternal: options.isExternal,
      isBuiltIn: options.isBuiltIn,
      serverId: id,
    });

  const tools = options.tools || (options.tool ? [options.tool] : []);

  return {
    id,
    name: options.name,
    transport: options.transport || "stdio",
    status: options.status || ("connected" as MCPServerConnectionStatus),
    tools,
    description:
      options.description || generateDescription(options.name, category),
    ...(options.command && { command: options.command }),
    ...(options.args && { args: options.args }),
    ...(options.env && { env: options.env }),
    metadata: {
      category: category as MCPServerCategory,
      toolCount: tools.length,
    },
  };
}

/**
 * Create MCPServerInfo for custom tool registration
 * Specialized version with smart defaults for registerTool usage
 */
export function createCustomToolServerInfo(
  toolName: string,
  tool: MCPExecutableTool,
): MCPServerInfo {
  return createMCPServerInfo({
    id: `custom-tool-${toolName}`,
    name: toolName,
    tool: {
      name: toolName,
      description: tool.description || toolName,
      inputSchema: tool.inputSchema || {},
      execute: tool.execute,
    },
    isCustomTool: true,
  });
}

/**
 * Create MCPServerInfo for external servers
 * Specialized version with smart defaults for external server usage
 */
export function createExternalServerInfo(options: {
  id: string;
  name?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: MCPServerInfo["transport"];
  description?: string;
  tools?: MCPServerInfo["tools"];
}): MCPServerInfo {
  return createMCPServerInfo({
    id: options.id,
    name: options.name || options.id,
    tools: options.tools || [],
    transport: options.transport || "stdio",
    description: options.description || options.name || options.id,
    isExternal: true,
    command: options.command,
    args: options.args,
    env: options.env,
  });
}
