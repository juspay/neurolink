/**
 * NeuroLink MCP Server Factory
 * Factory-First Architecture: MCP servers create tools for internal orchestration
 * Compatible with MCP patterns for seamless integration
 */

import { z } from "zod";
import type { ExecutionContext } from "./contracts/mcpContract.js";

/**
 * MCP Server Categories for organization and discovery
 */
export type MCPServerCategory =
  | "aiProviders"
  | "frameworks"
  | "development"
  | "business"
  | "content"
  | "data"
  | "integrations"
  | "automation"
  | "analysis"
  | "custom";

/**
 * Tool execution context - Rich context passed to every tool execution
 * Following standard patterns for rich tool context
 * Extends ExecutionContext for compatibility
 */
export interface NeuroLinkExecutionContext extends ExecutionContext {
  // Core identifiers (sessionId and userId already in ExecutionContext)

  // AI context
  aiProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;

  // Application context
  appId?: string;
  clientId?: string;
  clientVersion?: string;
  organizationId?: string;
  projectId?: string;

  // Environment context
  environment?: string;
  environmentType?: "development" | "staging" | "production";
  platform?: string;
  device?: string;
  browser?: string;
  userAgent?: string;

  // Framework Context (new)
  frameworkType?: "react" | "vue" | "svelte" | "next" | "nuxt" | "sveltekit";

  // Tool Execution Context
  toolChain?: string[];
  parentToolId?: string;

  // Location context
  locale?: string;
  timezone?: string;
  ipAddress?: string;

  // Request context
  requestId?: string;
  timestamp?: number;

  // Security context
  permissions?: string[];
  features?: string[];
  enableDemoMode?: boolean;
  securityLevel?: "public" | "private" | "organization";

  // Extensible metadata
  metadata?: Record<string, unknown>;

  // Extension points for custom context
  [key: string]: unknown;
}

/**
 * Tool execution result - Standardized result format
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string | Error;
  usage?: {
    tokens?: number;
    cost?: number;
    provider?: string;
    model?: string;
    executionTime?: number;
  };
  metadata?: {
    toolName?: string;
    serverId?: string;
    serverTitle?: string;
    sessionId?: string;
    timestamp?: number;
    executionTime?: number;
    executionId?: string;
    [key: string]: unknown;
  };
}

/**
 * MCP Tool Interface - Standard compatible with NeuroLink enhancements
 */
export interface NeuroLinkMCPTool {
  name: string;
  description: string;
  execute: (
    params: unknown,
    context: NeuroLinkExecutionContext,
  ) => Promise<ToolResult>;
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  isImplemented?: boolean;
  category?: string;
  permissions?: string[];
  version?: string;
  // Extension point for tool metadata
  metadata?: Record<string, unknown>;
}

/**
 * MCP Server Interface - Standard compatible
 */
export interface NeuroLinkMCPServer {
  // Server identification
  id: string;
  title: string;
  description?: string;
  version?: string;
  category?: MCPServerCategory;
  visibility?: "public" | "private" | "organization";

  // Tool management
  tools: Record<string, NeuroLinkMCPTool>;

  // Tool registration method
  registerTool(tool: NeuroLinkMCPTool): NeuroLinkMCPServer;

  // Extension points
  metadata?: Record<string, unknown>;
  dependencies?: string[];
  capabilities?: string[];
}

/**
 * MCP Server Configuration for creation
 */
export interface MCPServerConfig {
  id: string;
  title: string;
  description?: string;
  version?: string;
  category?: MCPServerCategory;
  visibility?: "public" | "private" | "organization";
  metadata?: Record<string, unknown>;
  dependencies?: string[];
  capabilities?: string[];
}

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
  metadata: z.record(z.any()).optional(),
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
      // Validate tool has required fields
      if (!tool.name || !tool.description || !tool.execute) {
        throw new Error(
          `Invalid tool: name, description, and execute are required`,
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
 * Utility function to validate tool interface
 */
export function validateTool(tool: NeuroLinkMCPTool): boolean {
  try {
    // Check required fields
    if (!tool.name || typeof tool.name !== "string") {
      return false;
    }
    if (!tool.description || typeof tool.description !== "string") {
      return false;
    }
    if (!tool.execute || typeof tool.execute !== "function") {
      return false;
    }

    // Validate optional schemas if present
    if (tool.inputSchema && !(tool.inputSchema instanceof z.ZodSchema)) {
      return false;
    }
    if (tool.outputSchema && !(tool.outputSchema instanceof z.ZodSchema)) {
      return false;
    }

    return true;
  } catch (error) {
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
  category?: MCPServerCategory;
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

// Types are already exported above via export interface declarations
