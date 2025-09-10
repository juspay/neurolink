/**
 * NeuroLink MCP Server Factory
 * Factory-First Architecture: MCP servers create tools for internal orchestration
 * Compatible with MCP patterns for seamless integration
 */

import { z } from "zod";
import type {
  MCPServerDomainCategory,
  NeuroLinkMCPTool,
  NeuroLinkMCPServer,
  MCPServerConfig,
} from "../types/mcpTypes.js";
import {
  validateMCPTool,
  ValidationError,
  createValidationSummary,
} from "../utils/parameterValidation.js";

/**
 * Input validation schemas
 */
const ServerConfigSchema = z.object({
  id: z.string().min(1, "Server ID is required"),
  title: z.string().min(1, "Server title is required"),
  description: z.string().optional(),
  version: z.string().optional(),
  category: z
    .enum([
      "aiProviders",
      "frameworks",
      "development",
      "business",
      "content",
      "data",
      "integrations",
      "automation",
      "analysis",
      "custom",
    ])
    .optional(),
  visibility: z.enum(["public", "private", "organization"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
});

/**
 * Create MCP Server Factory Function
 *
 * Core factory function for creating MCP servers.
 * Follows Factory-First architecture where tools are internal implementation.
 *
 * @param config Server configuration with minimal required fields
 * @returns Fully configured MCP server ready for tool registration
 *
 * @example
 * ```typescript
 * const aiCoreServer = createMCPServer({
 *   id: 'neurolink-ai-core',
 *   title: 'NeuroLink AI Core',
 *   description: 'Core AI provider tools',
 *   category: 'aiProviders'
 * });
 *
 * aiCoreServer.registerTool({
 *   name: 'generate',
 *   description: 'Generate text using AI providers',
 *   execute: async (params, context) => {
 *     // Tool implementation
 *     return { success: true, data: result };
 *   }
 * });
 * ```
 */
export function createMCPServer(config: MCPServerConfig): NeuroLinkMCPServer {
  // Validate configuration
  const validatedConfig = ServerConfigSchema.parse(config);

  // Create server with sensible defaults
  const server: NeuroLinkMCPServer = {
    // Required fields
    id: validatedConfig.id,
    title: validatedConfig.title,

    // Optional fields with defaults
    description: validatedConfig.description,
    version: validatedConfig.version || "1.0.0",
    category: validatedConfig.category || "custom",
    visibility: validatedConfig.visibility || "private",

    // Tool management
    tools: {},

    // Tool registration method
    registerTool(tool: NeuroLinkMCPTool): NeuroLinkMCPServer {
      // Comprehensive tool validation using centralized utilities
      const validation = validateMCPTool(tool);
      if (!validation.isValid) {
        const summary = createValidationSummary(validation);
        throw new ValidationError(
          `Invalid tool '${tool.name}': ${summary}`,
          "tool",
          "VALIDATION_FAILED",
          validation.suggestions,
        );
      }

      // Check for duplicate tool names
      if (this.tools[tool.name]) {
        throw new Error(
          `Tool '${tool.name}' already exists in server '${this.id}'`,
        );
      }

      // Register the tool
      this.tools[tool.name] = {
        ...tool,
        // Add server metadata to tool
        metadata: {
          ...tool.metadata,
          serverId: this.id,
          serverCategory: this.category,
          registeredAt: Date.now(),
        },
      };

      return this;
    },

    // Extension points
    metadata: validatedConfig.metadata || {},
    dependencies: validatedConfig.dependencies || [],
    capabilities: validatedConfig.capabilities || [],
  };

  return server;
}

/**
 * Utility function to validate tool interface using centralized validation
 * Ensures proper async patterns and type safety
 */
export function validateTool(tool: NeuroLinkMCPTool): boolean {
  try {
    const validation = validateMCPTool(tool);
    return validation.isValid;
  } catch {
    return false;
  }
}

/**
 * Utility function to get server info
 */
export function getServerInfo(server: NeuroLinkMCPServer): {
  id: string;
  title: string;
  description?: string;
  category?: MCPServerDomainCategory;
  toolCount: number;
  capabilities: string[];
} {
  return {
    id: server.id,
    title: server.title,
    description: server.description,
    category: server.category,
    toolCount: Object.keys(server.tools).length,
    capabilities: server.capabilities || [],
  };
}

/**
 * Async utility function to validate all tools in a server
 * Ensures all registered tools follow proper async patterns
 */
export async function validateServerTools(server: NeuroLinkMCPServer): Promise<{
  isValid: boolean;
  invalidTools: string[];
  errors: string[];
}> {
  const invalidTools: string[] = [];
  const errors: string[] = [];

  for (const [toolName, tool] of Object.entries(server.tools)) {
    try {
      if (!validateTool(tool)) {
        invalidTools.push(toolName);
        errors.push(`Tool '${toolName}' does not follow proper async patterns`);
      }
    } catch (error) {
      invalidTools.push(toolName);
      errors.push(
        `Tool '${toolName}' validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    isValid: invalidTools.length === 0,
    invalidTools,
    errors,
  };
}

// Types are already exported above via export interface declarations
