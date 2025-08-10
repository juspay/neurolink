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
   * Initialize the model registry from multiple sources with timeout handling
   * Addresses hanging issues when localhost:3001 is not running or GitHub URLs timeout
   */
  async initialize(): Promise<void> {
    const sources = [
      {
        url:
          process.env.MODEL_CONFIG_URL || "http://localhost:3001/api/v1/models",
        timeout: 3000, // 3s for localhost
        name: "local-server",
      },
      {
        url: `https://raw.githubusercontent.com/${process.env.MODEL_CONFIG_GITHUB_REPO || "juspay/neurolink"}/${process.env.MODEL_CONFIG_GITHUB_BRANCH || "release"}/config/models.json`,
        timeout: 5000, // 5s for GitHub
        name: "github-raw",
      },
      {
        url: "./config/models.json",
        timeout: 1000, // 1s for local file
        name: "local-file",
      },
    ];

    const errors: Array<{ source: string; error: string }> = [];

    for (const source of sources) {
      try {
        logger.debug(
          `[DynamicModelProvider] Attempting to load from: ${source.url} (timeout: ${source.timeout}ms)`,
        );

        const config = await this.loadFromSourceWithTimeout(
          source.url,
          source.timeout,
        );

        // Validate the configuration
        const validatedConfig = ModelRegistrySchema.parse(config);
        this.modelRegistry = validatedConfig;
        this.lastFetch = Date.now();

        logger.info(
          `[DynamicModelProvider] Successfully loaded model registry from: ${source.name}`,
          {
            source: source.url,
            modelCount: this.getTotalModelCount(),
            providerCount: Object.keys(validatedConfig.models).length,
            loadTime: `<${source.timeout}ms`,
          },
        );

        return; // Success, stop trying other sources
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ source: source.name, error: errorMessage });

        logger.warn(
          `[DynamicModelProvider] Failed to load from ${source.name} (${source.url}):`,
          {
            error: errorMessage,
            timeout: source.timeout,
          },
        );
        continue;
      }
    }

    // Log all failures for debugging
    logger.warn(
      `[DynamicModelProvider] All model configuration sources failed`,
      { errors },
    );

    throw new Error(
      `Failed to load model configuration from any source. Attempted: ${errors.map((e) => e.source).join(", ")}`,
    );
  }

  /**
   * Load configuration from a source with timeout handling
   * Prevents hanging when local servers are down or network requests timeout
   */
  private async loadFromSourceWithTimeout(
    source: string,
    timeoutMs: number,
  ): Promise<ModelRegistry> {
    if (source.startsWith("http")) {
      // Setup timeout and abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Add health check for localhost before attempting full request
        if (source.includes("localhost") || source.includes("127.0.0.1")) {
          await this.healthCheckLocalhost(source, Math.min(timeoutMs, 1000));
        }

        const response = await fetch(source, {
          headers: {
            "User-Agent":
              "NeuroLink/1.0 (+https://github.com/sachinsharma92/neurolink)",
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }

        throw error;
      }
    } else {
      // Load from local file with timeout (for very large files)
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`File read timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        (async () => {
          try {
            const fs = await import("fs");
            const path = await import("path");

            const fullPath = path.resolve(source);

            // Check if file exists first
            if (!fs.existsSync(fullPath)) {
              throw new Error(`File not found: ${fullPath}`);
            }

            const content = fs.readFileSync(fullPath, "utf8");
            const data = JSON.parse(content);

            clearTimeout(timeoutId);
            resolve(data);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        })();
      });
    }
  }

  /**
   * Quick health check for localhost endpoints
   * Prevents hanging on non-responsive local servers
   */
  private async healthCheckLocalhost(
    url: string,
    timeoutMs: number,
  ): Promise<void> {
    const healthUrl = url.replace(/\/api\/.*$/, "/health") || `${url}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(healthUrl, {
        method: "HEAD", // Lightweight request
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Don't throw on 404 - the main endpoint might still work
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Localhost health check timeout - server may not be running`,
        );
      }

      // For connection refused, throw a more specific error
      if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
        throw new Error(`Localhost server not running at ${url}`);
      }

      // For other errors, let the main request handle them
      logger.debug(
        `Health check failed for ${url}, proceeding with main request`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Load configuration from a source (URL or file path) - Legacy method for compatibility
   * @deprecated Use loadFromSourceWithTimeout instead
   */
  private async loadFromSource(source: string): Promise<ModelRegistry> {
    return this.loadFromSourceWithTimeout(source, 10000); // 10s default timeout
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
