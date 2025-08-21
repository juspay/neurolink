import { wrapLanguageModel } from "ai";
import type { LanguageModelV1 } from "ai";
import type {
  MiddlewareContext,
  MiddlewareConfig,
  MiddlewareFactoryOptions,
  MiddlewareChainStats,
  MiddlewareExecutionResult,
} from "./types.js";
import { middlewareRegistry } from "./registry.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware factory for creating and applying middleware chains
 */
export class MiddlewareFactory {
  /**
   * Apply middleware to a language model
   */
  static applyMiddleware(
    model: LanguageModelV1,
    context: MiddlewareContext,
    options: MiddlewareFactoryOptions = {},
  ): LanguageModelV1 {
    const startTime = Date.now();

    try {
      // Build middleware configuration
      const middlewareConfig = this.buildMiddlewareConfig(options);

      // Build middleware chain
      const middlewareChain = middlewareRegistry.buildChain(
        context,
        middlewareConfig,
      );

      if (middlewareChain.length === 0) {
        logger.debug("No middleware to apply", { provider: context.provider });
        return model;
      }

      logger.debug(`Applying ${middlewareChain.length} middleware to model`, {
        provider: context.provider,
        model: context.model,
        middlewareCount: middlewareChain.length,
      });

      // Apply middleware using AI SDK's wrapLanguageModel
      // Cast to the expected AI SDK middleware type
      const wrappedModel = wrapLanguageModel({
        model,
        middleware: middlewareChain,
      });

      const processingTime = Date.now() - startTime;
      logger.debug("Middleware applied successfully", {
        provider: context.provider,
        middlewareCount: middlewareChain.length,
        processingTime,
      });

      return wrappedModel;
    } catch (error) {
      logger.error("Failed to apply middleware", {
        provider: context.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return original model on error to maintain functionality
      return model;
    }
  }

  /**
   * Build middleware configuration from factory options
   */
  private static buildMiddlewareConfig(
    options: MiddlewareFactoryOptions,
  ): Record<string, MiddlewareConfig> {
    const config: Record<string, MiddlewareConfig> = {};

    // Start with all registered middleware
    const allMiddleware = middlewareRegistry.list();

    for (const middleware of allMiddleware) {
      // Default configuration
      config[middleware.metadata.id] = {
        enabled: middleware.metadata.defaultEnabled || false,
        config: {},
      };
    }

    // Apply preset configuration if specified
    if (options.preset) {
      const presetConfig = this.getPresetConfig(options.preset);
      if (presetConfig) {
        Object.assign(config, presetConfig);
      }
    }

    // Apply explicit middleware configurations
    if (options.middlewareConfig) {
      for (const [middlewareId, middlewareConfig] of Object.entries(
        options.middlewareConfig,
      )) {
        config[middlewareId] = {
          ...config[middlewareId],
          ...middlewareConfig,
        };
      }
    }

    // Apply enabled middleware list
    if (options.enabledMiddleware) {
      for (const middlewareId of options.enabledMiddleware) {
        if (config[middlewareId]) {
          config[middlewareId].enabled = true;
        }
      }
    }

    // Apply disabled middleware list
    if (options.disabledMiddleware) {
      for (const middlewareId of options.disabledMiddleware) {
        if (config[middlewareId]) {
          config[middlewareId].enabled = false;
        }
      }
    }

    return config;
  }

  /**
   * Get preset configuration
   */
  private static getPresetConfig(
    presetName: string,
  ): Record<string, MiddlewareConfig> | null {
    const presets = this.getBuiltInPresets();
    return presets[presetName] || null;
  }

  /**
   * Get built-in preset configurations
   */
  private static getBuiltInPresets(): Record<
    string,
    Record<string, MiddlewareConfig>
  > {
    return {
      // Development preset - logging and basic analytics
      development: {
        logging: { enabled: true },
        analytics: { enabled: true },
      },

      // Production preset - analytics, caching, rate limiting
      production: {
        analytics: { enabled: true },
        caching: { enabled: true },
        rateLimit: { enabled: true },
        retry: { enabled: true },
      },

      // Security preset - guardrails and content filtering
      security: {
        guardrails: { enabled: true },
        logging: { enabled: true },
        rateLimit: { enabled: true },
      },

      // Performance preset - caching and optimization
      performance: {
        caching: { enabled: true },
        retry: { enabled: true },
        timeout: { enabled: true },
      },

      // Enterprise preset - all middleware enabled
      enterprise: {
        analytics: { enabled: true },
        guardrails: { enabled: true },
        logging: { enabled: true },
        caching: { enabled: true },
        rateLimit: { enabled: true },
        retry: { enabled: true },
        timeout: { enabled: true },
      },

      // Minimal preset - only essential middleware
      minimal: {
        analytics: { enabled: true },
      },
    };
  }

  /**
   * Create middleware context from provider and options
   */
  static createContext(
    provider: string,
    model: string,
    options: Record<string, unknown> = {},
    session?: { sessionId?: string; userId?: string },
  ): MiddlewareContext {
    return {
      provider,
      model,
      options,
      session,
      metadata: {
        timestamp: Date.now(),
        requestId: `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  /**
   * Validate middleware configuration
   */
  static validateConfig(config: Record<string, MiddlewareConfig>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [middlewareId, middlewareConfig] of Object.entries(config)) {
      // Check if middleware is registered
      if (!middlewareRegistry.has(middlewareId)) {
        errors.push(`Middleware '${middlewareId}' is not registered`);
        continue;
      }

      // Validate configuration structure
      if (
        middlewareConfig.enabled !== undefined &&
        typeof middlewareConfig.enabled !== "boolean"
      ) {
        errors.push(
          `Middleware '${middlewareId}' enabled property must be boolean`,
        );
      }

      if (
        middlewareConfig.config &&
        typeof middlewareConfig.config !== "object"
      ) {
        errors.push(
          `Middleware '${middlewareId}' config property must be an object`,
        );
      }

      // Check for potential conflicts
      if (
        middlewareConfig.conditions?.providers &&
        middlewareConfig.conditions.providers.length === 0
      ) {
        warnings.push(
          `Middleware '${middlewareId}' has empty providers condition`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get available presets
   */
  static getAvailablePresets(): Array<{
    name: string;
    description: string;
    middleware: string[];
  }> {
    return [
      {
        name: "development",
        description: "Logging and basic analytics for development",
        middleware: ["logging", "analytics"],
      },
      {
        name: "production",
        description: "Optimized for production with caching and rate limiting",
        middleware: ["analytics", "caching", "rateLimit", "retry"],
      },
      {
        name: "security",
        description: "Enhanced security with guardrails and monitoring",
        middleware: ["guardrails", "logging", "rateLimit"],
      },
      {
        name: "performance",
        description: "Optimized for performance with caching and retries",
        middleware: ["caching", "retry", "timeout"],
      },
      {
        name: "enterprise",
        description: "Full enterprise feature set with all middleware",
        middleware: [
          "analytics",
          "guardrails",
          "logging",
          "caching",
          "rateLimit",
          "retry",
          "timeout",
        ],
      },
      {
        name: "minimal",
        description: "Minimal overhead with only essential features",
        middleware: ["analytics"],
      },
    ];
  }

  /**
   * Get middleware chain statistics
   */
  static getChainStats(
    context: MiddlewareContext,
    config: Record<string, MiddlewareConfig>,
  ): MiddlewareChainStats {
    const chain = middlewareRegistry.buildChain(context, config);
    const stats = middlewareRegistry.getAggregatedStats();

    const results: Record<string, MiddlewareExecutionResult> = {};
    let totalExecutionTime = 0;
    let appliedMiddleware = 0;

    for (const [middlewareId, middlewareStats] of Object.entries(stats)) {
      if (config[middlewareId]?.enabled) {
        results[middlewareId] = {
          applied: true,
          executionTime: middlewareStats.averageExecutionTime,
        };
        totalExecutionTime += middlewareStats.averageExecutionTime;
        appliedMiddleware++;
      }
    }

    return {
      totalMiddleware: chain.length,
      appliedMiddleware,
      totalExecutionTime,
      results,
    };
  }

  /**
   * Create a middleware-enabled model factory function
   */
  static createModelFactory(
    baseModelFactory: () => Promise<LanguageModelV1>,
    defaultOptions: MiddlewareFactoryOptions = {},
  ) {
    return async (
      context: MiddlewareContext,
      options: MiddlewareFactoryOptions = {},
    ): Promise<LanguageModelV1> => {
      // Get base model
      const baseModel = await baseModelFactory();

      // Merge options
      const _mergedOptions = {
        ...defaultOptions,
        ...options,
        middlewareConfig: {
          ...defaultOptions.middlewareConfig,
          ...options.middlewareConfig,
        },
      };

      // Apply middleware
      return this.applyMiddleware(baseModel, context, _mergedOptions);
    };
  }
}
