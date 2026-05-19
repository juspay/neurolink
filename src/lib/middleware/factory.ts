import type {
  MiddlewareContext,
  MiddlewareConfig,
  MiddlewareFactoryOptions,
  MiddlewareChainStats,
  MiddlewareExecutionResult,
  MiddlewarePreset,
  NeuroLinkMiddleware,
  MiddlewareRegistrationOptions,
} from "../types/index.js";
import { MiddlewareRegistry } from "./registry.js";
import { createAnalyticsMiddleware } from "./builtin/analytics.js";
import { createGuardrailsMiddleware } from "./builtin/guardrails.js";
import { createAutoEvaluationMiddleware } from "./builtin/autoEvaluation.js";
import { createLifecycleMiddleware } from "./builtin/lifecycle.js";
import { logger } from "../utils/logger.js";
import { wrapLanguageModel } from "../utils/generation.js";
import type { LanguageModel } from "../types/index.js";
import type { LanguageModelV3 } from "../types/index.js";

/**
 * Middleware factory for creating and applying middleware chains.
 * Each factory instance manages its own registry and configuration.
 */
export class MiddlewareFactory {
  public registry: MiddlewareRegistry;
  public presets = new Map<string, MiddlewarePreset>();
  private options: MiddlewareFactoryOptions;

  constructor(options: MiddlewareFactoryOptions = {}) {
    this.options = options;
    this.registry = new MiddlewareRegistry();
    this.initialize(options);
  }

  /**
   * Initialize the factory with built-in middleware and presets
   */
  private initialize(options: MiddlewareFactoryOptions): void {
    // Register built-in middleware creators
    const builtInMiddlewareCreators: Record<
      string,
      (config?: Record<string, unknown>) => NeuroLinkMiddleware
    > = {
      analytics: createAnalyticsMiddleware,
      guardrails: createGuardrailsMiddleware,
      autoEvaluation: createAutoEvaluationMiddleware,
      lifecycle: createLifecycleMiddleware,
    };

    // Register built-in presets
    this.registerPreset({
      name: "default",
      description: "Default preset with analytics enabled.",
      config: { analytics: { enabled: true } },
    });
    this.registerPreset({
      name: "all",
      description: "Enables all available middleware.",
      config: { analytics: { enabled: true }, guardrails: { enabled: true } },
    });
    this.registerPreset({
      name: "security",
      description: "Focuses on security with guardrails.",
      config: { guardrails: { enabled: true } },
    });

    // Register custom middleware if provided
    logger.debug("Initializing MiddlewareFactory", { options });
    if (options.middleware) {
      logger.debug(`Registering custom middleware`);
      for (const customMiddleware of options.middleware) {
        this.register(customMiddleware);
      }
    }

    // Register all built-in middleware so they are available to be configured
    for (const middlewareId in builtInMiddlewareCreators) {
      if (!this.registry.has(middlewareId)) {
        const creator = builtInMiddlewareCreators[middlewareId];
        const config = options.middlewareConfig?.[middlewareId]?.config;
        logger.debug(
          `Registering built-in middleware '${middlewareId}'`,
          config,
        );
        this.registry.register(creator(config));
      }
    }
  }

  /**
   * Register a custom preset
   */
  public registerPreset(preset: MiddlewarePreset, replace = false): void {
    if (this.presets.has(preset.name) && !replace) {
      throw new Error(
        `Preset with name '${preset.name}' already exists. Use replace: true to override.`,
      );
    }
    this.presets.set(preset.name, preset);
  }

  /**
   * Register a custom middleware
   */
  public register(
    middleware: NeuroLinkMiddleware,
    options?: MiddlewareRegistrationOptions,
  ): void {
    this.registry.register(middleware, options);
  }

  /**
   * Apply middleware to a language model
   */
  public applyMiddleware(
    model: LanguageModel,
    context: MiddlewareContext,
    options: MiddlewareFactoryOptions = {},
  ): LanguageModel {
    const startTime = Date.now();

    try {
      // Merge constructor options with call-time options
      const mergedOptions: MiddlewareFactoryOptions = {
        ...this.options,
        ...options,
        middlewareConfig: {
          ...this.options.middlewareConfig,
          ...options.middlewareConfig,
        },
      };
      // Build middleware configuration
      const middlewareConfig = this.buildMiddlewareConfig(mergedOptions);

      // Re-register middleware with the correct configuration for this call
      for (const [id, config] of Object.entries(middlewareConfig)) {
        logger.debug(`Configuring middleware '${id}'`, { config });
        if (config.enabled && this.registry.has(id)) {
          const creator = this.getCreator(id);
          if (creator) {
            this.registry.register(creator(config.config), { replace: true });
          }
        }
      }

      // Build middleware chain
      const middlewareChain = this.registry.buildChain(
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
      // wrapLanguageModel expects LanguageModelV3, narrow from LanguageModel union
      const modelV3 = model as LanguageModelV3;
      const wrappedModel = wrapLanguageModel({
        model: modelV3,
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

  private getCreator(id: string) {
    const builtInMiddlewareCreators: Record<
      string,
      (config?: Record<string, unknown>) => NeuroLinkMiddleware
    > = {
      analytics: createAnalyticsMiddleware,
      guardrails: createGuardrailsMiddleware,
      autoEvaluation: createAutoEvaluationMiddleware,
      lifecycle: createLifecycleMiddleware,
    };
    logger.debug("Getting creator for middleware ID:", id);
    return builtInMiddlewareCreators[id];
  }

  /**
   * Build middleware configuration from factory options
   */
  private buildMiddlewareConfig(
    options: MiddlewareFactoryOptions,
  ): Record<string, MiddlewareConfig> {
    const config: Record<string, MiddlewareConfig> = {};
    const allMiddleware = this.registry.list();

    // Initialize all middleware as disabled. Configuration will enable them.
    for (const middleware of allMiddleware) {
      config[middleware.metadata.id] = {
        enabled: false,
        config: {},
      };
    }

    // Determine which preset to use.
    let presetName = options.preset;
    // If no preset is given, and no other specific middleware config is provided, use the default.
    if (
      !presetName &&
      (!options.middlewareConfig ||
        Object.keys(options.middlewareConfig).length === 0) &&
      (!options.enabledMiddleware || options.enabledMiddleware.length === 0)
    ) {
      presetName = "default";
    }

    // Apply preset configuration
    if (presetName) {
      const presetConfig = this.getPresetConfig(presetName);
      if (presetConfig) {
        for (const [middlewareId, middlewareConfig] of Object.entries(
          presetConfig,
        )) {
          if (config[middlewareId]) {
            config[middlewareId] = {
              ...config[middlewareId],
              ...middlewareConfig,
            };
          }
        }
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
  private getPresetConfig(
    presetName: string,
  ): Record<string, MiddlewareConfig> | null {
    const preset = this.presets.get(presetName);
    return preset ? preset.config : null;
  }

  /**
   * Create middleware context from provider and options
   */
  public createContext(
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
  public validateConfig(config: Record<string, MiddlewareConfig>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [middlewareId, middlewareConfig] of Object.entries(config)) {
      // Check if middleware is registered
      if (!this.registry.has(middlewareId)) {
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
  public getAvailablePresets(): Array<{
    name: string;
    description: string;
    middleware: string[];
  }> {
    return Array.from(this.presets.values()).map((preset) => ({
      name: preset.name,
      description: preset.description,
      middleware: Object.keys(preset.config),
    }));
  }

  /**
   * Get middleware chain statistics
   */
  public getChainStats(
    context: MiddlewareContext,
    config: Record<string, MiddlewareConfig>,
  ): MiddlewareChainStats {
    const chain = this.registry.buildChain(context, config);
    const stats = this.registry.getAggregatedStats();

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
  public createModelFactory(
    baseModelFactory: () => Promise<LanguageModel>,
    defaultOptions: MiddlewareFactoryOptions = {},
  ) {
    return async (
      context: MiddlewareContext,
      options: MiddlewareFactoryOptions = {},
    ): Promise<LanguageModel> => {
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
