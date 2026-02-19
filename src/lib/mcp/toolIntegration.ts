/**
 * Tool Integration with Elicitation Context
 *
 * Provides integration between MCP tools and the elicitation protocol,
 * enabling tools to request interactive user input during execution.
 *
 * @module mcp/toolIntegration
 * @since 8.39.0
 */

import type { JsonObject } from "../types/common.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";
import type { MCPServerTool, MCPToolAnnotations } from "./toolAnnotations.js";
import type {
  ElicitationContext,
  ElicitationHandler,
  Elicitation,
  FormField,
} from "./elicitation/types.js";
import { ElicitationManager } from "./elicitation/elicitationManager.js";
import { ErrorFactory, withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";

/**
 * Tool execution context with elicitation support
 */
export type EnhancedExecutionContext = NeuroLinkExecutionContext & {
  /**
   * Elicitation context for interactive input
   */
  elicitation: ElicitationContext;

  /**
   * Tool metadata
   */
  toolMeta: {
    name: string;
    serverId?: string;
    annotations?: MCPToolAnnotations;
  };
};

/**
 * Tool wrapper options
 */
export type ToolWrapperOptions = {
  /**
   * Elicitation manager to use
   */
  elicitationManager?: ElicitationManager;

  /**
   * Auto-confirm destructive operations
   */
  autoConfirmDestructive?: boolean;

  /**
   * Default timeout for elicitations
   */
  elicitationTimeout?: number;

  /**
   * Enable logging
   */
  enableLogging?: boolean;
};

/**
 * Create elicitation context for a tool
 */
export function createElicitationContext(
  toolName: string,
  serverId: string | undefined,
  manager: ElicitationManager,
): ElicitationContext {
  return {
    confirm: async (message, options) => {
      return manager.confirm(message, {
        toolName,
        serverId,
        confirmLabel: options?.confirmLabel,
        cancelLabel: options?.cancelLabel,
      });
    },

    getText: async (message, options) => {
      return manager.getText(message, {
        toolName,
        placeholder: options?.placeholder,
        defaultValue: options?.defaultValue,
      });
    },

    select: async (message, options) => {
      return manager.select(message, options, { toolName });
    },

    multiSelect: async (message, options) => {
      return manager.multiSelect(message, options, { toolName });
    },

    form: async (message, fields) => {
      return manager.form(message, fields, { toolName, serverId });
    },

    request: async (elicitation) => {
      return manager.request({
        ...elicitation,
        toolName,
        serverId,
      } as Omit<Elicitation, "id">);
    },
  };
}

/**
 * Wrap a tool with elicitation support
 */
export function wrapToolWithElicitation(
  tool: MCPServerTool,
  options: ToolWrapperOptions = {},
): MCPServerTool {
  const {
    elicitationManager,
    autoConfirmDestructive = false,
    elicitationTimeout = 60000,
    enableLogging = true,
  } = options;

  const manager =
    elicitationManager ??
    new ElicitationManager({ defaultTimeout: elicitationTimeout });

  return {
    ...tool,
    execute: async (
      params: unknown,
      context?: NeuroLinkExecutionContext,
    ): Promise<ToolResult | unknown> => {
      const config = context?.config as Record<string, unknown> | undefined;
      const serverId = config?.serverId as string | undefined;

      // Create elicitation context
      const elicitationContext = createElicitationContext(
        tool.name,
        serverId,
        manager,
      );

      // Check if tool requires confirmation
      const needsConfirmation =
        tool.annotations?.requiresConfirmation ||
        tool.annotations?.destructiveHint;

      if (needsConfirmation && !autoConfirmDestructive) {
        if (enableLogging) {
          logger.debug(
            `[ToolIntegration] Tool '${tool.name}' requires confirmation`,
          );
        }

        const confirmed = await elicitationContext.confirm(
          `This operation (${tool.name}) ${
            tool.annotations?.destructiveHint ? "is destructive and " : ""
          }requires confirmation. Do you want to proceed?`,
          {
            confirmLabel: "Yes, proceed",
            cancelLabel: "Cancel",
          },
        );

        if (!confirmed) {
          return {
            success: false,
            error: "Operation cancelled by user",
            metadata: {
              toolName: tool.name,
              cancelled: true,
            },
          };
        }
      }

      // Create enhanced context
      const enhancedContext: EnhancedExecutionContext = {
        ...context,
        elicitation: elicitationContext,
        toolMeta: {
          name: tool.name,
          serverId,
          annotations: tool.annotations,
        },
      };

      // Execute the tool
      return tool.execute(params, enhancedContext);
    },
  };
}

/**
 * Batch wrap tools with elicitation support
 */
export function wrapToolsWithElicitation(
  tools: MCPServerTool[],
  options: ToolWrapperOptions = {},
): MCPServerTool[] {
  return tools.map((tool) => wrapToolWithElicitation(tool, options));
}

/**
 * Tool execution middleware
 */
export type ToolMiddleware = (
  tool: MCPServerTool,
  params: unknown,
  context: EnhancedExecutionContext,
  next: () => Promise<ToolResult | unknown>,
) => Promise<ToolResult | unknown>;

/**
 * Create a middleware chain for tool execution
 */
export function createToolMiddlewareChain(
  middlewares: ToolMiddleware[],
): ToolMiddleware {
  return async (tool, params, context, next) => {
    const dispatch = async (index: number): Promise<ToolResult | unknown> => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];
      return middleware(tool, params, context, () => dispatch(index + 1));
    };

    return dispatch(0);
  };
}

/**
 * Built-in middleware: Logging
 */
export const loggingMiddleware: ToolMiddleware = async (
  tool,
  params,
  context,
  next,
) => {
  const startTime = Date.now();
  logger.debug(`[ToolMiddleware] Executing tool '${tool.name}'`);

  try {
    const result = await next();
    const duration = Date.now() - startTime;

    logger.debug(
      `[ToolMiddleware] Tool '${tool.name}' completed in ${duration}ms`,
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[ToolMiddleware] Tool '${tool.name}' failed after ${duration}ms:`,
      error,
    );
    throw error;
  }
};

/**
 * Built-in middleware: Confirmation for destructive operations
 */
export const confirmationMiddleware: ToolMiddleware = async (
  tool,
  params,
  context,
  next,
) => {
  // Skip confirmation if elicitation context is not available
  if (!context.elicitation?.confirm) {
    return next();
  }

  if (
    tool.annotations?.destructiveHint ||
    tool.annotations?.requiresConfirmation
  ) {
    const confirmed = await context.elicitation.confirm(
      `Confirm execution of ${tool.name}?`,
    );

    if (!confirmed) {
      return {
        success: false,
        error: "Operation cancelled by user",
        metadata: { cancelled: true },
      };
    }
  }

  return next();
};

/**
 * Built-in middleware: Timeout
 */
export function createTimeoutMiddleware(timeoutMs: number): ToolMiddleware {
  return async (tool, params, context, next) => {
    return withTimeout(
      next(),
      timeoutMs,
      ErrorFactory.toolTimeout(tool.name, timeoutMs),
    );
  };
}

/**
 * Built-in middleware: Retry
 */
export function createRetryMiddleware(
  maxRetries: number,
  delayMs: number = 1000,
): ToolMiddleware {
  return async (tool, params, context, next) => {
    // Only retry idempotent or read-only tools
    const canRetry =
      tool.annotations?.idempotentHint || tool.annotations?.readOnlyHint;

    if (!canRetry) {
      return next();
    }

    const retries = Math.max(0, maxRetries);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await next();
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : ErrorFactory.toolExecutionFailed(
                tool.name,
                new Error(String(error)),
              );

        if (attempt < retries) {
          logger.warn(
            `[ToolMiddleware] Tool '${tool.name}' failed, retrying (${attempt + 1}/${retries})`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * (attempt + 1)),
          );
        }
      }
    }

    throw (
      lastError ??
      ErrorFactory.toolExecutionFailed(
        tool.name,
        new Error("Retry middleware exhausted without captured error"),
      )
    );
  };
}

/**
 * Built-in middleware: Parameter validation
 */
export const validationMiddleware: ToolMiddleware = async (
  tool,
  params,
  context,
  next,
) => {
  if (!tool.inputSchema) {
    return next();
  }

  const schema = tool.inputSchema as JsonObject;
  const required = (schema.required as string[]) ?? [];
  const properties = (schema.properties as JsonObject) ?? {};

  // Validate required parameters
  const paramObj = (params ?? {}) as Record<string, unknown>;
  const missing: string[] = [];

  for (const req of required) {
    if (paramObj[req] === undefined) {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    // Try to elicit missing parameters
    const formFields: FormField[] = missing.map((name) => {
      const prop = properties[name] as JsonObject | undefined;
      return {
        name,
        label: name,
        type: (prop?.type as FormField["type"]) ?? "text",
        required: true,
        description: prop?.description as string | undefined,
      };
    });

    const formResult = await context.elicitation.form(
      `Missing required parameters for ${tool.name}`,
      formFields,
    );

    if (!formResult) {
      return {
        success: false,
        error: `Missing required parameters: ${missing.join(", ")}`,
        metadata: { missingParams: missing },
      };
    }

    // Merge elicited values with params
    Object.assign(paramObj, formResult);
  }

  return next();
};

/**
 * Tool Integration Manager
 *
 * Manages tool execution with middleware and elicitation support.
 */
export class ToolIntegrationManager {
  private elicitationManager: ElicitationManager;
  private middlewares: ToolMiddleware[] = [];
  private wrappedTools: Map<string, MCPServerTool> = new Map();

  constructor(elicitationManager?: ElicitationManager) {
    this.elicitationManager = elicitationManager ?? new ElicitationManager();
  }

  /**
   * Set the elicitation handler
   */
  setElicitationHandler(handler: ElicitationHandler): void {
    this.elicitationManager.setHandler(handler);
  }

  /**
   * Add middleware
   */
  use(middleware: ToolMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Register a tool with integration
   */
  registerTool(tool: MCPServerTool): MCPServerTool {
    const wrapped = wrapToolWithElicitation(tool, {
      elicitationManager: this.elicitationManager,
    });

    this.wrappedTools.set(tool.name, wrapped);
    return wrapped;
  }

  /**
   * Execute a tool with full middleware chain
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ): Promise<ToolResult | unknown> {
    const tool = this.wrappedTools.get(toolName);

    if (!tool) {
      throw ErrorFactory.toolNotFound(
        toolName,
        Array.from(this.wrappedTools.keys()),
      );
    }

    // Normalize params to a mutable object so middleware (e.g. validationMiddleware)
    // can merge elicited values and have them forwarded to tool.execute
    const normalizedParams = params && typeof params === "object" ? params : {};

    const config = context?.config as Record<string, unknown> | undefined;
    const serverId = config?.serverId as string | undefined;

    // Create enhanced context
    const elicitationContext = createElicitationContext(
      toolName,
      serverId,
      this.elicitationManager,
    );

    const enhancedContext: EnhancedExecutionContext = {
      ...context,
      elicitation: elicitationContext,
      toolMeta: {
        name: toolName,
        serverId,
        annotations: tool.annotations,
      },
    };

    // Create middleware chain
    if (this.middlewares.length === 0) {
      return tool.execute(normalizedParams, enhancedContext);
    }

    const chain = createToolMiddlewareChain(this.middlewares);
    return chain(tool, normalizedParams, enhancedContext, () =>
      tool.execute(normalizedParams, enhancedContext),
    );
  }

  /**
   * Get registered tool
   */
  getTool(name: string): MCPServerTool | undefined {
    return this.wrappedTools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): MCPServerTool[] {
    return Array.from(this.wrappedTools.values());
  }

  /**
   * Get the elicitation manager
   */
  getElicitationManager(): ElicitationManager {
    return this.elicitationManager;
  }
}

/**
 * Module-level singleton ToolIntegrationManager.
 * Note: The default ElicitationManager has no handler set. Consumers must call
 * setElicitationHandler() before using elicitation methods.
 */
export const globalToolIntegrationManager = new ToolIntegrationManager();
