/**
 * NeuroLink SDK Tool Extension System
 * Allows developers to register custom tools that integrate with AI providers
 */

import { z } from "zod";
import { tool as createAISDKTool } from "ai";
import type { Tool } from "ai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { logger } from "../utils/logger.js";

/**
 * Custom tool interface for SDK users
 */
export interface CustomTool {
  /**
   * Tool description that helps AI understand when to use it
   */
  description: string;

  /**
   * Parameters schema using Zod or JSON Schema
   */
  parameters?: z.ZodSchema | Record<string, any>;

  /**
   * Tool execution function
   */
  execute: (args: any, context?: ToolContext) => Promise<any> | any;

  /**
   * Optional metadata
   */
  category?: string;
  version?: string;
  author?: string;

  /**
   * Optional configuration
   */
  config?: {
    timeout?: number; // milliseconds
    retries?: number;
    rateLimit?: {
      requests: number;
      window: number; // milliseconds
    };
  };
}

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  /**
   * Call another tool
   */
  callTool: (name: string, args: any) => Promise<any>;

  /**
   * Current session information
   */
  session: {
    id: string;
    userId?: string;
    provider?: string;
    model?: string;
  };

  /**
   * Logger instance
   */
  logger: typeof logger;
}

/**
 * Tool middleware function
 */
export type ToolMiddleware = (
  toolName: string,
  args: any,
  next: () => Promise<any>,
  context: ToolContext,
) => Promise<any>;

/**
 * Tool permission configuration
 */
export interface ToolPermissions {
  allowlist?: string[];
  denylist?: string[];
  requireApproval?: string[];
  customValidator?: (toolName: string, args: any) => boolean | Promise<boolean>;
}

/**
 * Converts a custom tool to Vercel AI SDK format
 */
export function convertToAISDKTool(name: string, customTool: CustomTool): Tool {
  // Convert parameters to JSON schema if needed
  let parametersSchema: any = {};
  let zodSchema: z.ZodSchema;

  if (customTool.parameters) {
    if ("parse" in customTool.parameters && "_def" in customTool.parameters) {
      // It's a Zod schema
      zodSchema = customTool.parameters as z.ZodSchema;
      parametersSchema = zodToJsonSchema(zodSchema);
    } else {
      // It's already a JSON schema - convert to Zod
      parametersSchema = customTool.parameters;
      zodSchema = z.object({}).passthrough(); // Allow any properties
    }
  } else {
    zodSchema = z.object({});
  }

  return createAISDKTool({
    description: customTool.description,
    parameters: zodSchema,
    execute: async (args) => {
      try {
        // Apply timeout if configured
        if (customTool.config?.timeout) {
          return await Promise.race([
            customTool.execute(args),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error(`Tool ${name} timed out`)),
                customTool.config!.timeout,
              ),
            ),
          ]);
        }

        return await customTool.execute(args);
      } catch (error) {
        logger.error(`Tool ${name} execution failed:`, error);
        throw error;
      }
    },
  });
}

/**
 * Tool registry for managing custom tools
 */
export class ToolRegistry {
  private tools = new Map<string, CustomTool>();
  private middleware: ToolMiddleware[] = [];
  private permissions: ToolPermissions = {};
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  /**
   * Simple rate limiting check with automatic cleanup
   */
  private checkRateLimit(
    name: string,
    rateLimit: { requests: number; window: number },
  ): void {
    const now = Date.now();

    // Clean up expired entries to prevent memory leaks
    for (const [key, limit] of this.rateLimits.entries()) {
      if (limit.resetTime <= now) {
        this.rateLimits.delete(key);
      }
    }

    const limit = this.rateLimits.get(name);

    if (limit && limit.resetTime > now) {
      if (limit.count >= rateLimit.requests) {
        throw new Error(`Tool ${name} rate limit exceeded`);
      }
      limit.count++;
    } else {
      this.rateLimits.set(name, {
        count: 1,
        resetTime: now + rateLimit.window,
      });
    }
  }

  /**
   * Register a custom tool
   */
  register(name: string, tool: CustomTool): void {
    if (this.tools.has(name)) {
      logger.warn(`Tool ${name} already registered, overwriting`);
    }

    this.tools.set(name, tool);
    logger.info(`Registered custom tool: ${name}`);
  }

  /**
   * Register multiple tools at once
   */
  registerMany(tools: Record<string, CustomTool>): void {
    Object.entries(tools).forEach(([name, tool]) => {
      this.register(name, tool);
    });
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const result = this.tools.delete(name);
    if (result) {
      logger.info(`Unregistered tool: ${name}`);
    }
    return result;
  }

  /**
   * Get a tool by name
   */
  get(name: string): CustomTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): Map<string, CustomTool> {
    return new Map(this.tools);
  }

  /**
   * Convert all tools to AI SDK format
   */
  toAISDKTools(): Record<string, Tool> {
    const aiTools: Record<string, Tool> = {};

    for (const [name, tool] of this.tools) {
      if (this.isToolAllowed(name)) {
        aiTools[name] = convertToAISDKTool(name, tool);
      }
    }

    return aiTools;
  }

  /**
   * Add middleware
   */
  use(middleware: ToolMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Set permissions
   */
  setPermissions(permissions: ToolPermissions): void {
    this.permissions = permissions;
  }

  /**
   * Check if a tool is allowed
   */
  private isToolAllowed(name: string): boolean {
    // Check denylist first
    if (this.permissions.denylist?.includes(name)) {
      return false;
    }

    // Check allowlist if specified
    if (
      this.permissions.allowlist &&
      !this.permissions.allowlist.includes(name)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Execute a tool with middleware
   */
  async execute(name: string, args: any, context: ToolContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Check permissions
    if (!this.isToolAllowed(name)) {
      throw new Error(`Tool ${name} is not allowed`);
    }

    // Check custom validator
    if (this.permissions.customValidator) {
      const allowed = await this.permissions.customValidator(name, args);
      if (!allowed) {
        throw new Error(`Tool ${name} execution denied by custom validator`);
      }
    }

    // Check rate limit
    if (tool.config?.rateLimit) {
      this.checkRateLimit(name, tool.config.rateLimit);
    }

    // Build middleware chain
    let index = 0;
    const next = async (): Promise<any> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        return middleware(name, args, next, context);
      } else {
        // Execute the actual tool
        return tool.execute(args, context);
      }
    };

    return next();
  }
}

/**
 * Create a simple tool helper
 */
export function createTool(config: CustomTool): CustomTool {
  return config;
}

/**
 * Create an async tool helper
 */
export function createAsyncTool(
  config: Omit<CustomTool, "execute"> & {
    execute: (args: any, context?: ToolContext) => Promise<any>;
  },
): CustomTool {
  return config as CustomTool;
}

/**
 * Create a batch tool that processes multiple items
 */
export function createBatchTool<T, R>(
  config: Omit<CustomTool, "execute" | "parameters"> & {
    parameters: z.ZodSchema<{ items: T[] }>;
    processItem: (item: T, context?: ToolContext) => Promise<R> | R;
    batchSize?: number;
  },
): CustomTool {
  return {
    ...config,
    execute: async ({ items }, context) => {
      const batchSize = config.batchSize || 10;
      const results: R[] = [];

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((item: T) => config.processItem(item, context)),
        );
        results.push(...batchResults);
      }

      return results;
    },
  };
}

/**
 * Tool testing utilities
 */
export const TestUtils = {
  /**
   * Create a mock tool context
   */
  mockContext(overrides?: Partial<ToolContext>): ToolContext {
    return {
      callTool: async (name, args) => {
        logger.debug(`Mock tool call: ${name}`, args);
        return {};
      },
      session: {
        id: "test-session",
        userId: "test-user",
        provider: "test-provider",
        model: "test-model",
      },
      logger,
      ...overrides,
    };
  },

  /**
   * Test a tool with mock data
   */
  async testTool(
    tool: CustomTool,
    testCases: Array<{ input: any; expected?: any }>,
  ) {
    const context = TestUtils.mockContext();
    const results = [];

    for (const testCase of testCases) {
      try {
        const result = await tool.execute(testCase.input, context);
        results.push({
          input: testCase.input,
          output: result,
          success: true,
          matches: testCase.expected
            ? JSON.stringify(result) === JSON.stringify(testCase.expected)
            : undefined,
        });
      } catch (error) {
        results.push({
          input: testCase.input,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    return results;
  },
};
