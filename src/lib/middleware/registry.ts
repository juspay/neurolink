import type { LanguageModelV1Middleware } from "ai";
import type {
  NeuroLinkMiddleware,
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareRegistrationOptions,
  MiddlewareExecutionResult,
} from "../types/middlewareTypes.js";
import { logger } from "../utils/logger.js";

/**
 * Manages the registration, configuration, and execution of middleware for a single factory instance.
 */
export class MiddlewareRegistry {
  private middleware = new Map<string, NeuroLinkMiddleware>();
  private globalConfigs = new Map<string, Record<string, unknown>>();
  private executionStats = new Map<string, MiddlewareExecutionResult[]>();

  /**
   * Register a middleware
   */
  register(
    middleware: NeuroLinkMiddleware,
    options: MiddlewareRegistrationOptions = {},
  ): void {
    const { replace = false, defaultEnabled = false, globalConfig } = options;
    logger.debug(`Registering middleware: ${middleware.metadata.id}`);

    // Check if middleware already exists
    if (this.middleware.has(middleware.metadata.id) && !replace) {
      throw new Error(
        `Middleware with ID '${middleware.metadata.id}' already exists. Use replace: true to override.`,
      );
    }

    // Set default enabled state
    if (middleware.metadata.defaultEnabled === undefined) {
      middleware.metadata.defaultEnabled = defaultEnabled;
    }

    // Store middleware
    this.middleware.set(middleware.metadata.id, middleware);

    // Store global configuration if provided
    if (globalConfig) {
      this.globalConfigs.set(middleware.metadata.id, globalConfig);
    }

    logger.debug(`Middleware registered: ${middleware.metadata.id}`, {
      name: middleware.metadata.name,
      priority: middleware.metadata.priority || 0,
      defaultEnabled: middleware.metadata.defaultEnabled,
    });
  }

  /**
   * Unregister a middleware
   */
  unregister(middlewareId: string): boolean {
    const removed = this.middleware.delete(middlewareId);
    this.globalConfigs.delete(middlewareId);
    this.executionStats.delete(middlewareId);

    if (removed) {
      logger.debug(`Middleware unregistered: ${middlewareId}`);
    }

    return removed;
  }

  /**
   * Get a registered middleware
   */
  get(middlewareId: string): NeuroLinkMiddleware | undefined {
    return this.middleware.get(middlewareId);
  }

  /**
   * List all registered middleware
   */
  list(): NeuroLinkMiddleware[] {
    return Array.from(this.middleware.values());
  }

  /**
   * Get middleware IDs sorted by priority
   */
  getSortedIds(): string[] {
    return Array.from(this.middleware.values())
      .sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0))
      .map((m) => m.metadata.id);
  }

  /**
   * Build middleware chain based on configuration
   */
  buildChain(
    context: MiddlewareContext,
    config: Record<string, MiddlewareConfig> = {},
  ): LanguageModelV1Middleware[] {
    const chain: LanguageModelV1Middleware[] = [];
    const sortedIds = this.getSortedIds();

    logger.debug("Building middleware chain", { config, sortedIds });
    for (const middlewareId of sortedIds) {
      const middleware = this.middleware.get(middlewareId);
      logger.debug(`Evaluating middleware: ${middlewareId}`, { middleware });
      if (!middleware) {
        continue;
      }

      const middlewareConfig = config[middlewareId];
      const globalConfig = this.globalConfigs.get(middlewareId);

      // Determine if middleware should be applied
      const shouldApply = this.shouldApplyMiddleware(
        middleware,
        middlewareConfig,
        context,
      );

      if (shouldApply) {
        // Create configured middleware instance
        const configuredMiddleware = this.configureMiddleware(
          middleware,
          middlewareConfig,
          globalConfig,
          context,
        );

        chain.push(configuredMiddleware);

        logger.debug(`Added middleware to chain: ${middlewareId}`, {
          priority: middleware.metadata.priority || 0,
          chainLength: chain.length,
        });
      }
    }

    return chain;
  }

  /**
   * Determine if middleware should be applied based on conditions
   */
  private shouldApplyMiddleware(
    middleware: NeuroLinkMiddleware,
    config: MiddlewareConfig | undefined,
    context: MiddlewareContext,
  ): boolean {
    // Check if explicitly disabled
    if (config?.enabled === false) {
      return false;
    }

    // Check if explicitly enabled or default enabled
    const isEnabled =
      config?.enabled === true ||
      (config?.enabled === undefined && middleware.metadata.defaultEnabled);

    if (!isEnabled) {
      return false;
    }

    // Check conditions
    const conditions = config?.conditions;
    if (!conditions) {
      return true;
    }

    // Check provider conditions
    if (
      conditions.providers &&
      !conditions.providers.includes(context.provider)
    ) {
      return false;
    }

    // Check model conditions
    if (conditions.models && !conditions.models.includes(context.model)) {
      return false;
    }

    // Check option conditions
    if (conditions.options) {
      for (const [key, value] of Object.entries(conditions.options)) {
        if (context.options[key] !== value) {
          return false;
        }
      }
    }

    // Check custom condition
    if (conditions.custom && !conditions.custom(context)) {
      return false;
    }

    return true;
  }

  /**
   * Configure middleware with runtime configuration
   */
  private configureMiddleware(
    middleware: NeuroLinkMiddleware,
    config: MiddlewareConfig | undefined,
    globalConfig: Record<string, unknown> | undefined,
    _context: MiddlewareContext,
  ): LanguageModelV1Middleware {
    // Merge configurations: global < middleware config < runtime config
    const _mergedConfig = {
      ...globalConfig,
      ...config?.config,
    };

    // Create wrapper that tracks execution
    const wrappedMiddleware: NeuroLinkMiddleware = {
      metadata: middleware.metadata,
    };

    if (middleware.transformParams) {
      wrappedMiddleware.transformParams = async (args) => {
        const startTime = Date.now();
        try {
          if (!middleware.transformParams) {
            throw new Error("transformParams method is required");
          }
          const result = await middleware.transformParams(args);
          this.recordExecution(middleware.metadata.id, startTime, true);
          return result;
        } catch (error) {
          this.recordExecution(
            middleware.metadata.id,
            startTime,
            false,
            error as Error,
          );
          throw error;
        }
      };
    }

    if (middleware.wrapGenerate) {
      wrappedMiddleware.wrapGenerate = async (args) => {
        const startTime = Date.now();
        try {
          if (!middleware.wrapGenerate) {
            throw new Error("wrapGenerate method is required");
          }
          const result = await middleware.wrapGenerate(args);
          this.recordExecution(middleware.metadata.id, startTime, true);
          return result;
        } catch (error) {
          this.recordExecution(
            middleware.metadata.id,
            startTime,
            false,
            error as Error,
          );
          throw error;
        }
      };
    }

    if (middleware.wrapStream) {
      wrappedMiddleware.wrapStream = async (args) => {
        const startTime = Date.now();
        try {
          if (!middleware.wrapStream) {
            throw new Error("wrapStream method is required");
          }
          const result = await middleware.wrapStream(args);
          this.recordExecution(middleware.metadata.id, startTime, true);
          return result;
        } catch (error) {
          this.recordExecution(
            middleware.metadata.id,
            startTime,
            false,
            error as Error,
          );
          throw error;
        }
      };
    }

    return wrappedMiddleware;
  }

  /**
   * Record middleware execution statistics
   */
  private recordExecution(
    middlewareId: string,
    startTime: number,
    success: boolean,
    error?: Error,
  ): void {
    const executionTime = Date.now() - startTime;
    const result: MiddlewareExecutionResult = {
      applied: true,
      executionTime,
      error,
    };

    if (!this.executionStats.has(middlewareId)) {
      this.executionStats.set(middlewareId, []);
    }

    const stats = this.executionStats.get(middlewareId) || [];
    stats.push(result);

    // Keep only last 100 executions per middleware
    if (stats.length > 100) {
      stats.shift();
    }

    if (error) {
      logger.warn(`Middleware execution failed: ${middlewareId}`, {
        executionTime,
        error: error.message,
      });
    } else {
      logger.debug(`Middleware executed: ${middlewareId}`, {
        executionTime,
        success,
      });
    }
  }

  /**
   * Get execution statistics for a middleware
   */
  getExecutionStats(middlewareId: string): MiddlewareExecutionResult[] {
    return this.executionStats.get(middlewareId) || [];
  }

  /**
   * Get aggregated statistics for all middleware
   */
  getAggregatedStats(): Record<
    string,
    {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
      lastExecutionTime: number;
    }
  > {
    const stats: Record<
      string,
      {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageExecutionTime: number;
        lastExecutionTime: number;
      }
    > = {};

    for (const [middlewareId, executions] of this.executionStats.entries()) {
      const successful = executions.filter((e) => !e.error).length;
      const failed = executions.filter((e) => e.error).length;
      const totalTime = executions.reduce((sum, e) => sum + e.executionTime, 0);
      const lastExecution = executions[executions.length - 1];

      stats[middlewareId] = {
        totalExecutions: executions.length,
        successfulExecutions: successful,
        failedExecutions: failed,
        averageExecutionTime:
          executions.length > 0 ? totalTime / executions.length : 0,
        lastExecutionTime: lastExecution?.executionTime || 0,
      };
    }

    return stats;
  }

  /**
   * Clear execution statistics
   */
  clearStats(middlewareId?: string): void {
    if (middlewareId) {
      this.executionStats.delete(middlewareId);
    } else {
      this.executionStats.clear();
    }
  }

  /**
   * Check if a middleware is registered
   */
  has(middlewareId: string): boolean {
    return this.middleware.has(middlewareId);
  }

  /**
   * Get the number of registered middleware
   */
  size(): number {
    return this.middleware.size;
  }

  /**
   * Clear all registered middleware
   */
  clear(): void {
    this.middleware.clear();
    this.globalConfigs.clear();
    this.executionStats.clear();
    logger.debug("All middleware cleared from registry");
  }
}
