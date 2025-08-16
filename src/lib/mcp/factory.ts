/**
 * NeuroLink MCP Server Factory
 * Factory-First Architecture: MCP servers create tools for internal orchestration
 * Compatible with MCP patterns for seamless integration
 */

import { z } from "zod";
import type { ExecutionContext } from "./contracts/mcpContract.js";
import {
  validateMCPTool,
  ValidationError,
  createValidationSummary,
} from "../utils/parameterValidation.js";

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
 * MCP Tool Interface - Standalone definition to avoid confusion with ToolDefinition execute signature
 */
/**
 * NeuroLink MCP Tool Interface - Standardized tool definition for MCP integration
 *
 * This interface defines the contract for all tools in the NeuroLink ecosystem,
 * ensuring consistent execution patterns and metadata handling across different
 * MCP servers and tool implementations.
 *
 * Key features:
 * - Promise-based execution with ToolResult return type
 * - Rich context support for session management and permissions
 * - Optional schema validation for input/output
 * - Comprehensive metadata support for tool discovery
 *
 * @example
 * ```typescript
 * const calculatorTool: NeuroLinkMCPTool = {
 *   name: "calculator",
 *   description: "Performs basic arithmetic operations",
 *   category: "math",
 *   inputSchema: z.object({ a: z.number(), b: z.number(), op: z.string() }),
 *   async execute(params, context) {
 *     const { a, b, op } = params as { a: number; b: number; op: string };
 *     const result = op === "add" ? a + b : a - b;
 *     return { success: true, data: result };
 *   }
 * };
 * ```
 */
export interface NeuroLinkMCPTool {
  /** Unique tool identifier for MCP registration and execution */
  name: string;

  /** Human-readable description of tool functionality */
  description: string;

  /** Optional category for tool organization and discovery */
  category?: string;

  /** Optional input schema for parameter validation (Zod or JSON Schema) */
  inputSchema?: unknown;

  /** Optional output schema for result validation */
  outputSchema?: unknown;

  /** Implementation status flag for development tracking */
  isImplemented?: boolean;

  /** Required permissions for tool execution in secured environments */
  permissions?: string[];

  /** Tool version for compatibility and update management */
  version?: string;

  /** Additional metadata for tool information and capabilities */
  metadata?: Record<string, unknown>;

  /**
   * Tool execution function with standardized signature
   *
   * @param params - Input parameters for the tool (validated against inputSchema if provided)
   * @param context - Execution context with session, user, and environment information
   * @returns Promise resolving to ToolResult with success status, data, and metadata
   * @throws ValidationError if parameters fail validation
   */
  execute: (
    params: unknown,
    context: NeuroLinkExecutionContext,
  ) => Promise<ToolResult>;
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
