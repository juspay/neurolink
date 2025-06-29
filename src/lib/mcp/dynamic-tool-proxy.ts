/**
 * Dynamic Tool Proxy - Creates AI SDK tools that execute external MCP servers on demand
 * Converts MCP tool schemas to Zod schemas and handles dynamic tool execution
 */

import { tool } from "ai";
import { z } from "zod";
import { mcpLogger } from './logging.js';
import { MCPServerPool } from './mcp-server-pool.js';
import { MCPProtocolHandler } from './mcp-protocol-handler.js';
import {
  MCPTool,
  ExternalMCPServerConfig,
  MCPToolExecutionResult,
  MCPContent,
  MCPProtocolError,
} from './types/mcp-protocol.js';

interface DynamicToolInfo {
  serverConfig: ExternalMCPServerConfig;
  toolDefinition: MCPTool;
  aiSDKTool: any; // AI SDK tool instance
}

interface ToolExecutionContext {
  sessionId: string;
  userId: string;
  timeout?: number;
}

export class DynamicToolProxy {
  private tools = new Map<string, DynamicToolInfo>();

  constructor(
    private serverPool: MCPServerPool,
    private protocolHandler: MCPProtocolHandler
  ) {}

  /**
   * Register an external MCP tool and create an AI SDK tool for it
   */
  registerExternalTool(
    serverConfig: ExternalMCPServerConfig,
    toolDefinition: MCPTool
  ): any {
    const toolKey = `${serverConfig.name}.${toolDefinition.name}`;
    
    mcpLogger.debug(`[DynamicToolProxy] Registering external tool: ${toolKey}`);

    // Convert MCP schema to Zod schema
    const zodSchema = this.convertMCPSchemaToZod(toolDefinition.inputSchema);

    // Create AI SDK tool that executes on demand
    const aiSDKTool = tool({
      description: toolDefinition.description || `External MCP tool: ${toolDefinition.name}`,
      parameters: zodSchema,
      execute: async (args: any) => {
        return this.executeExternalTool(serverConfig, toolDefinition.name, args);
      },
    });

    // Store tool info
    const toolInfo: DynamicToolInfo = {
      serverConfig,
      toolDefinition,
      aiSDKTool,
    };

    this.tools.set(toolKey, toolInfo);
    
    mcpLogger.info(`[DynamicToolProxy] Registered external tool: ${toolKey}`);
    return aiSDKTool;
  }

  /**
   * Get all registered AI SDK tools
   */
  getAllTools(): Record<string, any> {
    const allTools: Record<string, any> = {};

    for (const [toolKey, toolInfo] of this.tools) {
      // Use prefixed key for external tools to avoid conflicts
      const prefixedKey = `mcp_ext_${toolKey.replace('.', '_')}`;
      allTools[prefixedKey] = toolInfo.aiSDKTool;
    }

    mcpLogger.debug(`[DynamicToolProxy] Returning ${Object.keys(allTools).length} external tools`);
    return allTools;
  }

  /**
   * Execute an external MCP tool by spawning server and calling tool
   */
  private async executeExternalTool(
    serverConfig: ExternalMCPServerConfig,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const toolKey = `${serverConfig.name}.${toolName}`;
    mcpLogger.info(`[DynamicToolProxy] Executing external tool: ${toolKey}`, { args });

    const startTime = Date.now();

    try {
      // Get or spawn server
      const server = await this.serverPool.getServer(serverConfig);
      
      // Initialize server if not already done
      if (server.status === 'ready' && !server.capabilities) {
        await this.protocolHandler.initialize(server);
        await this.protocolHandler.listTools(server);
      } else if (server.status === 'initializing') {
        // Wait for initialization to complete
        await this.waitForServerReady(server);
      }

      // Verify tool exists on server
      const toolExists = server.tools.some(t => t.name === toolName);
      if (!toolExists) {
        throw new Error(`Tool ${toolName} not found on server ${serverConfig.name}`);
      }

      // Execute tool
      const result = await this.protocolHandler.callTool(server, toolName, args);

      // Process and format result
      const processedResult = this.processToolResult(result);
      
      const executionTime = Date.now() - startTime;
      mcpLogger.info(`[DynamicToolProxy] Tool execution successful: ${toolKey} (${executionTime}ms)`);

      // Update server last used time
      server.lastUsed = Date.now();

      return processedResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      mcpLogger.error(`[DynamicToolProxy] Tool execution failed: ${toolKey} (${executionTime}ms)`, error);
      
      // Return error in a format that AI can understand
      throw new Error(`External tool ${toolKey} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServerReady(server: any, timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (server.status !== 'ready' && Date.now() - startTime < timeoutMs) {
      if (server.status === 'error' || server.status === 'terminated') {
        throw new Error(`Server failed to become ready: ${server.name}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (server.status !== 'ready') {
      throw new Error(`Server did not become ready within ${timeoutMs}ms: ${server.name}`);
    }
  }

  /**
   * Process MCP tool result into a format suitable for AI consumption
   */
  private processToolResult(result: any): any {
    if (!result) {
      return null;
    }

    // Handle MCP tool result format
    if (result.content && Array.isArray(result.content)) {
      const contents = result.content as MCPContent[];
      
      // If there's only one text content, return it directly
      if (contents.length === 1 && contents[0].type === 'text') {
        return contents[0].text;
      }

      // For multiple contents, combine them
      const textContents = contents
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .filter(Boolean);

      if (textContents.length === 1) {
        return textContents[0];
      } else if (textContents.length > 1) {
        return textContents.join('\n\n');
      }

      // For non-text content, return structured data
      return contents;
    }

    // Handle direct result
    if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
      return result;
    }

    // For objects, try to extract meaningful data
    if (typeof result === 'object') {
      // Common patterns in MCP results
      if (result.text) return result.text;
      if (result.content) return result.content;
      if (result.data) return result.data;
      if (result.result) return result.result;
      
      // Return the whole object if no specific pattern matches
      return result;
    }

    return result;
  }

  /**
   * Convert MCP JSON Schema to Zod schema for AI SDK
   */
  private convertMCPSchemaToZod(inputSchema: any): z.ZodSchema {
    if (!inputSchema || inputSchema.type !== 'object') {
      // Default to empty object if no schema provided
      return z.object({});
    }

    const properties = inputSchema.properties || {};
    const required = inputSchema.required || [];
    const zodProps: Record<string, z.ZodTypeAny> = {};

    for (const [propName, propDef] of Object.entries(properties)) {
      const propSchema = propDef as any;
      const isRequired = required.includes(propName);

      let zodType: z.ZodTypeAny;

      switch (propSchema.type) {
        case 'string':
          zodType = z.string();
          if (propSchema.enum) {
            zodType = z.enum(propSchema.enum);
          }
          break;

        case 'number':
        case 'integer':
          zodType = z.number();
          if (propSchema.minimum !== undefined) {
            zodType = (zodType as z.ZodNumber).min(propSchema.minimum);
          }
          if (propSchema.maximum !== undefined) {
            zodType = (zodType as z.ZodNumber).max(propSchema.maximum);
          }
          break;

        case 'boolean':
          zodType = z.boolean();
          break;

        case 'array':
          const itemSchema = propSchema.items;
          if (itemSchema?.type === 'string') {
            zodType = z.array(z.string());
          } else if (itemSchema?.type === 'number') {
            zodType = z.array(z.number());
          } else if (itemSchema?.type === 'object' && itemSchema.properties) {
            zodType = z.array(this.convertMCPSchemaToZod(itemSchema));
          } else {
            // Fallback for arrays without items specification - use string array
            // This is more compatible with Google AI's API requirements
            zodType = z.array(z.any()).describe('Array of any type');
          }
          break;

        case 'object':
          if (propSchema.properties) {
            zodType = this.convertMCPSchemaToZod(propSchema);
          } else {
            zodType = z.record(z.any());
          }
          break;

        default:
          zodType = z.any();
          break;
      }

      // Add description if available
      if (propSchema.description) {
        zodType = zodType.describe(propSchema.description);
      }

      // Make optional if not required
      if (!isRequired) {
        zodType = zodType.optional();
      }

      zodProps[propName] = zodType;
    }

    return z.object(zodProps);
  }

  /**
   * Get tool information for a specific tool
   */
  getToolInfo(toolKey: string): DynamicToolInfo | undefined {
    return this.tools.get(toolKey);
  }

  /**
   * Get all registered tool keys
   */
  getToolKeys(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolKey: string): boolean {
    const removed = this.tools.delete(toolKey);
    if (removed) {
      mcpLogger.debug(`[DynamicToolProxy] Unregistered tool: ${toolKey}`);
    }
    return removed;
  }

  /**
   * Clear all registered tools
   */
  clearAllTools(): void {
    const count = this.tools.size;
    this.tools.clear();
    mcpLogger.info(`[DynamicToolProxy] Cleared ${count} registered tools`);
  }

  /**
   * Get statistics about registered tools
   */
  getStats() {
    const toolsByServer: Record<string, number> = {};
    
    for (const [toolKey, toolInfo] of this.tools) {
      const serverName = toolInfo.serverConfig.name;
      toolsByServer[serverName] = (toolsByServer[serverName] || 0) + 1;
    }

    return {
      totalTools: this.tools.size,
      toolsByServer,
      toolKeys: Array.from(this.tools.keys()),
    };
  }
}