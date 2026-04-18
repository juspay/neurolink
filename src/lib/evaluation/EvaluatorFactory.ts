/**
 * @file EvaluatorFactory - Factory for creating evaluator instances.
 * Extends BaseFactory to provide dynamic evaluator creation with configuration support.
 */

import { BaseFactory } from "../core/infrastructure/index.js";
import type { EvaluationConfig, EvaluatorPreset } from "../types/index.js";
import { Evaluator } from "./index.js";
import { createConfigurationError } from "./errors/EvaluationError.js";

/**
 * Factory for creating Evaluator instances with various configurations.
 * Supports presets for common use cases and custom configurations.
 *
 * @example
 * ```typescript
 * const factory = EvaluatorFactory.getInstance();
 *
 * // Create with default configuration
 * const evaluator = await factory.create('default');
 *
 * // Create with a preset
 * const strictEvaluator = await factory.create('strict');
 *
 * // Create with custom config
 * const customEvaluator = await factory.create('default', {
 *   threshold: 9,
 *   evaluationModel: 'gpt-4',
 *   provider: 'openai'
 * });
 * ```
 */
export class EvaluatorFactory extends BaseFactory<Evaluator, EvaluationConfig> {
  private static instance: EvaluatorFactory | null = null;

  private constructor() {
    super();
  }

  /**
   * Gets the singleton instance of the EvaluatorFactory.
   */
  public static getInstance(): EvaluatorFactory {
    if (!EvaluatorFactory.instance) {
      EvaluatorFactory.instance = new EvaluatorFactory();
    }
    return EvaluatorFactory.instance;
  }

  /**
   * Resets the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    EvaluatorFactory.instance = null;
  }

  /**
   * Registers all built-in evaluator configurations.
   * This is called automatically on first access.
   */
  protected async registerAll(): Promise<void> {
    // Register default configuration
    this.register(
      "default",
      async (config?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          threshold: 7,
          evaluationStrategy: "ragas",
          evaluationModel:
            process.env.NEUROLINK_RAGAS_EVALUATION_MODEL || "gemini-1.5-flash",
          provider: process.env.NEUROLINK_RAGAS_EVALUATION_PROVIDER || "vertex",
          ...config,
        };
        if (config) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      ["standard", "basic"],
      {
        preset: {
          name: "Default",
          description: "Standard evaluation with balanced settings",
        },
      },
    );

    // Register strict configuration (higher threshold)
    this.register(
      "strict",
      async (config?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          threshold: 8,
          evaluationStrategy: "ragas",
          evaluationModel: "gpt-4",
          provider: "openai",
          ...config,
        };
        if (config) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      ["high-quality", "production"],
      {
        preset: {
          name: "Strict",
          description: "Strict evaluation with higher quality threshold (8/10)",
        },
      },
    );

    // Register lenient configuration (lower threshold)
    this.register(
      "lenient",
      async (config?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          threshold: 5,
          evaluationStrategy: "ragas",
          evaluationModel:
            process.env.NEUROLINK_RAGAS_EVALUATION_MODEL || "gemini-1.5-flash",
          provider: process.env.NEUROLINK_RAGAS_EVALUATION_PROVIDER || "vertex",
          ...config,
        };
        if (config) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      ["relaxed", "development"],
      {
        preset: {
          name: "Lenient",
          description:
            "Lenient evaluation with lower threshold for development (5/10)",
        },
      },
    );

    // Register fast configuration (optimized for speed)
    this.register(
      "fast",
      async (config?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          threshold: 6,
          evaluationStrategy: "ragas",
          evaluationModel: "gemini-1.5-flash",
          provider: "vertex",
          ...config,
        };
        if (config) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      ["quick", "speed"],
      {
        preset: {
          name: "Fast",
          description: "Fast evaluation optimized for speed with lighter model",
        },
      },
    );

    // Register premium configuration (highest quality)
    this.register(
      "premium",
      async (config?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          threshold: 9,
          evaluationStrategy: "ragas",
          evaluationModel: "gpt-4-turbo",
          provider: "openai",
          ...config,
        };
        if (config) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      ["enterprise", "highest-quality"],
      {
        preset: {
          name: "Premium",
          description:
            "Premium evaluation with highest quality model and strictest threshold (9/10)",
        },
      },
    );
  }

  /**
   * Creates an evaluator instance with the specified preset and optional config overrides.
   *
   * @param presetOrName - The preset name or alias
   * @param config - Optional configuration overrides
   * @returns A configured Evaluator instance
   */
  public async createEvaluator(
    presetOrName: string = "default",
    config?: EvaluationConfig,
  ): Promise<Evaluator> {
    return this.create(presetOrName, config);
  }

  /**
   * Creates an evaluator with a fully custom configuration (not based on a preset).
   *
   * @param config - The evaluation configuration
   * @returns A configured Evaluator instance
   */
  public createCustomEvaluator(config: EvaluationConfig): Evaluator {
    this.validateConfig(config);
    return new Evaluator(config);
  }

  /**
   * Gets information about a preset by name or alias.
   *
   * @param presetOrName - The preset name or alias
   * @returns The preset information or undefined if not found
   */
  public async getPresetInfo(
    presetOrName: string,
  ): Promise<EvaluatorPreset | undefined> {
    await this.ensureInitialized();
    const name = this.resolveName(presetOrName);
    const registration = this.items.get(name);
    if (!registration?.metadata?.preset) {
      return undefined;
    }
    return registration.metadata.preset as EvaluatorPreset;
  }

  /**
   * Lists all available presets with their descriptions.
   *
   * @returns Array of preset information
   */
  public async listPresets(): Promise<
    Array<{
      name: string;
      aliases: string[];
      preset: EvaluatorPreset;
    }>
  > {
    await this.ensureInitialized();
    const presets: Array<{
      name: string;
      aliases: string[];
      preset: EvaluatorPreset;
    }> = [];

    const entries = Array.from(this.items.entries());
    for (const [name, registration] of entries) {
      if (registration.metadata?.preset) {
        presets.push({
          name,
          aliases: registration.aliases,
          preset: registration.metadata.preset as EvaluatorPreset,
        });
      }
    }

    return presets;
  }

  /**
   * Validates an evaluation configuration.
   *
   * @param config - The configuration to validate
   * @throws {NeuroLinkFeatureError} If the configuration is invalid
   */
  public validateConfig(config: EvaluationConfig): void {
    if (config.threshold !== undefined) {
      if (config.threshold < 1 || config.threshold > 10) {
        throw createConfigurationError(
          "Evaluation threshold must be between 1 and 10",
          "threshold out of range",
        );
      }
    }

    if (config.evaluationStrategy === "custom" && !config.customEvaluator) {
      throw createConfigurationError(
        "Custom evaluation strategy requires a customEvaluator function",
        "missing customEvaluator",
      );
    }

    if (config.offTopicThreshold !== undefined) {
      if (config.offTopicThreshold < 1 || config.offTopicThreshold > 10) {
        throw createConfigurationError(
          "Off-topic threshold must be between 1 and 10",
          "offTopicThreshold out of range",
        );
      }
    }

    if (config.highSeverityThreshold !== undefined) {
      if (
        config.highSeverityThreshold < 1 ||
        config.highSeverityThreshold > 10
      ) {
        throw createConfigurationError(
          "High severity threshold must be between 1 and 10",
          "highSeverityThreshold out of range",
        );
      }
    }
  }

  /**
   * Registers a custom evaluator preset.
   *
   * @param name - Unique name for the preset
   * @param config - The evaluation configuration for this preset
   * @param aliases - Alternative names for the preset
   * @param description - Human-readable description
   */
  public registerPreset(
    name: string,
    config: EvaluationConfig,
    aliases: string[] = [],
    description: string = "",
  ): void {
    this.validateConfig(config);

    this.register(
      name,
      async (overrides?: EvaluationConfig) => {
        const mergedConfig: EvaluationConfig = {
          ...config,
          ...overrides,
        };
        if (overrides) {
          this.validateConfig(mergedConfig);
        }
        return new Evaluator(mergedConfig);
      },
      aliases,
      {
        preset: {
          name,
          description,
          config,
        },
      },
    );
  }

  /**
   * Unregisters a preset from the factory.
   *
   * @param name - The preset name to remove
   * @returns true if the preset was removed, false if it didn't exist
   */
  public unregisterPreset(name: string): boolean {
    const registration = this.items.get(name);
    if (registration) {
      // Remove aliases
      for (const alias of registration.aliases) {
        this.aliasMap.delete(alias.toLowerCase());
      }
      this.items.delete(name);
      return true;
    }
    return false;
  }
}

// Export singleton instance getter for convenience
export const getEvaluatorFactory = (): EvaluatorFactory =>
  EvaluatorFactory.getInstance();
