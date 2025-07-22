/**
 * NeuroLink SDK Tool Registration API
 * Simple interface for developers to register custom tools
 */

import { z } from "zod";
import { tool as createAISDKTool } from "ai";
import type { Tool } from "ai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { logger } from "../utils/logger.js";
import type {
  InMemoryMCPServerConfig,
  InMemoryToolInfo,
} from "../types/mcp-types.js";

/**
 * Configuration constants for tool validation
 */
const envValue = parseInt(
  process.env.NEUROLINK_TOOL_DESCRIPTION_MAX_LENGTH || "200",
  10,
);
const DEFAULT_DESCRIPTION_MAX_LENGTH =
  Number.isInteger(envValue) && envValue > 0 ? envValue : 200;

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  /**
   * Current session ID
   */
  sessionId: string;

  /**
   * User ID if available
   */
  userId?: string;

  /**
   * AI provider being used
   */
  provider?: string;

  /**
   * Model being used
   */
  model?: string;

  /**
   * Call another tool
   */
  callTool?: (name: string, args: any) => Promise<any>;

  /**
   * Logger instance
   */
  logger: typeof logger;
}

/**
 * Simple tool interface for SDK users
 */
export interface SimpleTool {
  /**
   * Tool description that helps AI understand when to use it
   */
  description: string;

  /**
   * Parameters schema using Zod (optional)
   */
  parameters?: z.ZodSchema;

  /**
   * Tool execution function
   */
  execute: (args: any, context?: ToolContext) => Promise<any> | any;

  /**
   * Optional metadata
   */
  metadata?: {
    category?: string;
    version?: string;
    author?: string;
    [key: string]: any;
  };
}

/**
 * Converts a SimpleTool to Vercel AI SDK format
 */
export function convertToAISDKTool(name: string, simpleTool: SimpleTool): Tool {
  return createAISDKTool({
    description: simpleTool.description,
    parameters: simpleTool.parameters || z.object({}),
    execute: async (args) => {
      try {
        // Create a minimal context for standalone execution
        const context: ToolContext = {
          sessionId: `tool-${name}-${Date.now()}`,
          logger,
        };

        const result = await simpleTool.execute(args, context);
        return result;
      } catch (error) {
        logger.error(`Tool ${name} execution failed:`, error);
        throw error;
      }
    },
  });
}

/**
 * Converts a SimpleTool to MCP tool format
 */
export function convertToMCPTool(simpleTool: SimpleTool): InMemoryToolInfo {
  return {
    description: simpleTool.description,
    execute: async (params: any) => {
      try {
        const result = await simpleTool.execute(params);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("MCP tool execution failed:", error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    inputSchema: simpleTool.parameters,
    isImplemented: true,
    metadata: simpleTool.metadata,
  };
}

/**
 * Creates an in-memory MCP server configuration from a set of tools
 */
export function createMCPServerFromTools(
  serverId: string,
  tools: Record<string, SimpleTool>,
  metadata?: {
    title?: string;
    description?: string;
    category?: string;
    [key: string]: any;
  },
): InMemoryMCPServerConfig {
  const mcpTools: Record<string, InMemoryToolInfo> = {};

  for (const [name, tool] of Object.entries(tools)) {
    mcpTools[name] = convertToMCPTool(tool);
  }

  return {
    server: {
      title: metadata?.title || serverId,
      description: metadata?.description,
      tools: mcpTools,
    },
    category: metadata?.category,
    metadata: metadata || {},
  };
}

/**
 * Helper to create a tool with type safety
 */
export function createTool<TParams = any>(config: SimpleTool): SimpleTool {
  return config;
}

/**
 * Helper to create a tool with typed parameters
 */
export function createTypedTool<TParams extends z.ZodSchema>(
  config: Omit<SimpleTool, "execute"> & {
    parameters: TParams;
    execute: (
      args: z.infer<TParams>,
      context?: ToolContext,
    ) => Promise<any> | any;
  },
): SimpleTool {
  return config as SimpleTool;
}

/**
 * Validate tool description length
 */
function validateDescriptionLength(name: string, description: string): void {
  const maxDescriptionLength =
    Number.isInteger(DEFAULT_DESCRIPTION_MAX_LENGTH) &&
    DEFAULT_DESCRIPTION_MAX_LENGTH > 0
      ? DEFAULT_DESCRIPTION_MAX_LENGTH
      : 200;

  if (description.length > maxDescriptionLength) {
    throw new Error(
      `Tool '${name}' description should be concise (max ${maxDescriptionLength} characters). ` +
        `Current length: ${description.length}. ` +
        `Consider shortening: "${description.substring(0, 50)}..."`,
    );
  }
}

/**
 * Validate tool configuration with detailed error messages
 */
export function validateTool(name: string, tool: SimpleTool): void {
  // Validate tool name
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error(
      `Invalid tool name: must be a non-empty string. Received: ${name}`,
    );
  }

  // Validate tool name format (alphanumeric, hyphens, underscores only)
  const validNamePattern = /^[a-zA-Z0-9_-]+$/;
  if (!validNamePattern.test(name)) {
    throw new Error(
      `Invalid tool name format: '${name}'. Tool names must contain only alphanumeric characters, hyphens, and underscores. ` +
        `Examples: 'calculate-tax', 'get_weather', 'sendEmail123'`,
    );
  }

  // Validate tool object
  if (!tool || typeof tool !== "object") {
    throw new Error(
      `Tool '${name}' must be an object with description and execute properties. Received: ${typeof tool}`,
    );
  }

  // Validate description
  if (
    !tool.description ||
    typeof tool.description !== "string" ||
    tool.description.trim() === ""
  ) {
    throw new Error(
      `Tool '${name}' must have a non-empty description string. ` +
        `Example: { description: "Calculates mathematical expressions", execute: async (params) => {...} }`,
    );
  }

  // Validate execute function with signature guidance
  if (typeof tool.execute !== "function") {
    throw new Error(
      `Tool '${name}' must have an execute function. ` +
        `Expected signature: async (params?: any) => Promise<any>. ` +
        `Received: ${typeof tool.execute}. ` +
        `Example: { execute: async (params) => { return { success: true, data: result }; } }`,
    );
  }

  // Validate parameters schema if provided - support both Zod and custom schemas
  if (tool.parameters) {
    if (typeof tool.parameters !== "object") {
      throw new Error(
        `Tool '${name}' parameters must be an object. ` +
          `Received: ${typeof tool.parameters}`,
      );
    }

    // Check for common schema validation methods (Zod uses 'parse', others might use 'validate')
    const params = tool.parameters as any;
    const hasValidationMethod =
      typeof params.parse === "function" ||
      typeof params.validate === "function" ||
      "_def" in params; // Zod schemas have _def property

    if (!hasValidationMethod) {
      const errorMessage =
        typeof params.parse === "function" || "_def" in params
          ? `Tool '${name}' has a Zod-like schema but validation failed. Ensure it's a valid Zod schema: z.object({ ... })`
          : typeof params.validate === "function"
            ? `Tool '${name}' has a validate method but it may not be callable. Ensure: { parameters: { validate: (data) => { ... } } }`
            : `Tool '${name}' parameters must be a schema object with validation. ` +
              `Supported formats:\n` +
              `• Zod schema: { parameters: z.object({ value: z.string() }) }\n` +
              `• Custom schema: { parameters: { validate: (data) => { ... } } }\n` +
              `• Custom schema: { parameters: { parse: (data) => { ... } } }`;

      throw new Error(errorMessage);
    }
  }

  // Validate description length for better UX
  validateDescriptionLength(name, tool.description);
}
