import { z } from "zod";
import { logger } from "../utils/logger.js";

/**
 * Model configuration schema for validation
 */
const ModelConfigSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  capabilities: z.array(z.string()),
  deprecated: z.boolean(),
  pricing: z.object({
    input: z.number(),
    output: z.number(),
  }),
  contextWindow: z.number(),
  releaseDate: z.string(),
});

const ModelRegistrySchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  models: z.record(z.record(ModelConfigSchema)),
  aliases: z.record(z.string()).optional(),
  defaults: z.record(z.string()).optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelRegistry = z.infer<typeof ModelRegistrySchema>;

/**
 * Dynamic Model Provider
 * Loads and manages model configurations from external sources
 */
export class DynamicModelProvider {
  private static instance: DynamicModelProvider;
  private modelRegistry: ModelRegistry | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): DynamicModelProvider {
    if (!this.instance) {
      this.instance = new DynamicModelProvider();
    }
    return this.instance;
  }

  /**
   * Initialize the model registry from multiple sources
   */
  async initialize(): Promise<void> {
    const sources = [
      process.env.MODEL_CONFIG_URL || "http://localhost:3001/api/v1/models",
      `https://raw.githubusercontent.com/${process.env.MODEL_CONFIG_GITHUB_REPO || "juspay/neurolink"}/${process.env.MODEL_CONFIG_GITHUB_BRANCH || "release"}/config/models.json`,
      "./config/models.json", // Local fallback
    ];

    for (const source of sources) {
      try {
        logger.debug(
          `[DynamicModelProvider] Attempting to load from: ${source}`,
        );
        const config = await this.loadFromSource(source);

        // Validate the configuration
        const validatedConfig = ModelRegistrySchema.parse(config);
        this.modelRegistry = validatedConfig;
        this.lastFetch = Date.now();

        logger.info(
          `[DynamicModelProvider] Successfully loaded model registry from: ${source}`,
          {
            modelCount: this.getTotalModelCount(),
            providerCount: Object.keys(validatedConfig.models).length,
          },
        );

        return; // Success, stop trying other sources
      } catch (error) {
        logger.warn(
          `[DynamicModelProvider] Failed to load from ${source}:`,
          error,
        );
        continue;
      }
    }

    throw new Error("Failed to load model configuration from any source");
  }

  /**
   * Load configuration from a source (URL or file path)
   */
  private async loadFromSource(source: string): Promise<ModelRegistry> {
    if (source.startsWith("http")) {
      // Load from URL
      const response = await fetch(source, {
        headers: {
          "User-Agent":
            "NeuroLink/1.0 (+https://github.com/juspay/neurolink)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } else {
      // Load from local file
      const fs = await import("fs");
      const path = await import("path");

      const fullPath = path.resolve(source);
      const content = fs.readFileSync(fullPath, "utf8");
      return JSON.parse(content);
    }
  }

  /**
   * Get all available models for a provider
   */
  getModelsForProvider(provider: string): Record<string, ModelConfig> {
    this.ensureInitialized();
    return this.modelRegistry?.models[provider] || {};
  }

  /**
   * Resolve a model by provider and model hint
   */
  resolveModel(provider: string, modelHint?: string): ModelConfig | null {
    this.ensureInitialized();

    const providerModels = this.getModelsForProvider(provider);

    if (!modelHint) {
      // Use default model for provider
      const defaultModel = this.modelRegistry?.defaults?.[provider];
      return defaultModel ? providerModels[defaultModel] : null;
    }

    // Check for exact match
    if (providerModels[modelHint]) {
      return providerModels[modelHint];
    }

    // Check aliases
    const aliasTarget = this.modelRegistry?.aliases?.[modelHint];
    if (aliasTarget) {
      const [aliasProvider, aliasModel] = aliasTarget.split("/");
      return this.resolveModel(aliasProvider, aliasModel);
    }

    // Fuzzy matching (partial string match)
    const fuzzyMatch = Object.keys(providerModels).find(
      (key) =>
        key.toLowerCase().includes(modelHint.toLowerCase()) ||
        modelHint.toLowerCase().includes(key.toLowerCase()),
    );

    return fuzzyMatch ? providerModels[fuzzyMatch] : null;
  }

  /**
   * Search models by capabilities
   */
  searchByCapability(
    capability: string,
    options: {
      provider?: string;
      maxPrice?: number;
      excludeDeprecated?: boolean;
    } = {},
  ): Array<{ provider: string; model: string; config: ModelConfig }> {
    this.ensureInitialized();

    const results: Array<{
      provider: string;
      model: string;
      config: ModelConfig;
    }> = [];

    for (const [providerName, models] of Object.entries(
      this.modelRegistry!.models,
    )) {
      if (options.provider && providerName !== options.provider) {
        continue;
      }

      for (const [modelName, modelConfig] of Object.entries(models)) {
        if (options.excludeDeprecated && modelConfig.deprecated) {
          continue;
        }
        if (options.maxPrice && modelConfig.pricing.input > options.maxPrice) {
          continue;
        }
        if (!modelConfig.capabilities.includes(capability)) {
          continue;
        }

        results.push({
          provider: providerName,
          model: modelName,
          config: modelConfig,
        });
      }
    }

    // Sort by price (cheapest first)
    return results.sort(
      (a, b) => a.config.pricing.input - b.config.pricing.input,
    );
  }

  /**
   * Get the best model for a specific use case
   */
  getBestModelFor(
    useCase: "coding" | "analysis" | "vision" | "fastest" | "cheapest",
  ): {
    provider: string;
    model: string;
    config: ModelConfig;
  } | null {
    this.ensureInitialized();

    switch (useCase) {
      case "coding":
        return (
          this.searchByCapability("functionCalling", {
            excludeDeprecated: true,
          })[0] || null
        );

      case "analysis":
        return (
          this.searchByCapability("analysis", { excludeDeprecated: true })[0] ||
          null
        );

      case "vision":
        return (
          this.searchByCapability("vision", { excludeDeprecated: true })[0] ||
          null
        );

      case "fastest":
        // Return cheapest as proxy for fastest (usually correlates)
        return (
          this.getAllModels()
            .filter((m) => !m.config.deprecated)
            .sort(
              (a, b) => a.config.pricing.input - b.config.pricing.input,
            )[0] || null
        );

      case "cheapest":
        return (
          this.getAllModels()
            .filter((m) => !m.config.deprecated)
            .sort(
              (a, b) => a.config.pricing.input - b.config.pricing.input,
            )[0] || null
        );

      default:
        return null;
    }
  }

  /**
   * Get all models across all providers
   */
  getAllModels(): Array<{
    provider: string;
    model: string;
    config: ModelConfig;
  }> {
    this.ensureInitialized();

    const results: Array<{
      provider: string;
      model: string;
      config: ModelConfig;
    }> = [];

    for (const [providerName, models] of Object.entries(
      this.modelRegistry!.models,
    )) {
      for (const [modelName, modelConfig] of Object.entries(models)) {
        results.push({
          provider: providerName,
          model: modelName,
          config: modelConfig,
        });
      }
    }

    return results;
  }

  /**
   * Get total number of models
   */
  getTotalModelCount(): number {
    if (!this.modelRegistry) {
      return 0;
    }

    return Object.values(this.modelRegistry.models).reduce(
      (total, providerModels) => total + Object.keys(providerModels).length,
      0,
    );
  }

  /**
   * Check if cache needs refresh
   */
  needsRefresh(): boolean {
    return Date.now() - this.lastFetch > this.CACHE_DURATION;
  }

  /**
   * Force refresh the model registry
   */
  async refresh(): Promise<void> {
    this.modelRegistry = null;
    await this.initialize();
  }

  /**
   * Ensure the registry is initialized
   */
  private ensureInitialized(): void {
    if (!this.modelRegistry) {
      throw new Error(
        "Model registry not initialized. Call initialize() first.",
      );
    }
  }

  /**
   * Get registry metadata
   */
  getMetadata(): {
    version: string;
    lastUpdated: string;
    modelCount: number;
  } | null {
    if (!this.modelRegistry) {
      return null;
    }

    return {
      version: this.modelRegistry.version,
      lastUpdated: this.modelRegistry.lastUpdated,
      modelCount: this.getTotalModelCount(),
    };
  }
}

// Export singleton instance
export const dynamicModelProvider = DynamicModelProvider.getInstance();
