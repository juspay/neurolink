/**
 * Registry Fetcher
 *
 * Fetches model information from external registries (OpenRouter, models.dev)
 * with caching and error handling.
 */

import { createProxyFetch } from "../proxy/proxyFetch.js";
import { logger } from "../utils/logger.js";
import {
  CACHE_TTL_MS,
  DEFAULT_REGISTRY_SOURCES,
  REGISTRY_FETCH_TIMEOUT_MS,
} from "./constants.js";
import { RegistryFetchError } from "./errors.js";
import { getGlobalCache, RegistryCache } from "./registryCache.js";
import {
  mergeModelSources,
  parseModelsDevResponse,
  parseOpenRouterResponse,
} from "./registryParsers.js";
import type {
  GatewayModelInfo,
  RegistryConfig,
  RegistrySource,
} from "./types.js";

/**
 * Default registry configuration
 */
const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  sources: DEFAULT_REGISTRY_SOURCES,
  refreshIntervalMs: CACHE_TTL_MS,
  cacheEnabled: true,
  cacheTtlMs: CACHE_TTL_MS,
};

/**
 * Registry Fetcher - Fetches and caches model information
 *
 * Features:
 * - Multi-source fetching (OpenRouter, models.dev)
 * - Caching with configurable TTL
 * - Deduplication of concurrent fetch requests
 * - Graceful degradation on source failures
 *
 * @example
 * ```typescript
 * const fetcher = new RegistryFetcher();
 *
 * // Get all models
 * const models = await fetcher.getModels();
 *
 * // Get models for specific provider
 * const anthropicModels = await fetcher.getProviderModels("anthropic");
 *
 * // Search models
 * const results = await fetcher.searchModels("claude");
 * ```
 */
export class RegistryFetcher {
  private cache: RegistryCache;
  private config: RegistryConfig;
  private fetchPromise: Promise<GatewayModelInfo[]> | null = null;

  constructor(config?: Partial<RegistryConfig>) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    this.cache = this.config.cacheEnabled
      ? getGlobalCache()
      : new RegistryCache();
  }

  /**
   * Get all available models from registry
   * Uses caching with configurable TTL
   *
   * @returns Array of all available models
   */
  async getModels(): Promise<GatewayModelInfo[]> {
    // Return cached if valid
    if (this.config.cacheEnabled) {
      const cached = this.cache.get("all");
      if (cached) {
        logger.debug(`Returning ${cached.length} cached models`);
        return cached;
      }
    }

    // Deduplicate concurrent fetches
    if (this.fetchPromise) {
      logger.debug("Returning existing fetch promise (deduplication)");
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchFromSources();

    try {
      const models = await this.fetchPromise;

      // Cache the results
      if (this.config.cacheEnabled) {
        this.cache.set("all", models, this.config.cacheTtlMs);
      }

      return models;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Get models for a specific provider
   *
   * @param provider - Provider name (e.g., "anthropic", "openai")
   * @returns Array of models for the provider
   */
  async getProviderModels(provider: string): Promise<GatewayModelInfo[]> {
    const lowerProvider = provider.toLowerCase();

    // Check provider-specific cache
    const cacheKey = `provider:${lowerProvider}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const allModels = await this.getModels();
    const providerModels = allModels.filter(
      (m) => m.provider.toLowerCase() === lowerProvider,
    );

    // Cache provider-specific results with shorter TTL
    if (this.config.cacheEnabled && providerModels.length > 0) {
      this.cache.set(cacheKey, providerModels, this.config.cacheTtlMs / 2);
    }

    return providerModels;
  }

  /**
   * Get specific model info by ID
   *
   * @param modelId - Full model ID (e.g., "anthropic/claude-3-5-sonnet")
   * @returns Model info or undefined if not found
   */
  async getModel(modelId: string): Promise<GatewayModelInfo | undefined> {
    const lowerId = modelId.toLowerCase();
    const allModels = await this.getModels();

    // Exact match
    const exact = allModels.find((m) => m.id.toLowerCase() === lowerId);
    if (exact) {
      return exact;
    }

    // Check aliases
    return allModels.find((m) =>
      m.aliases?.some((a) => a.toLowerCase() === lowerId),
    );
  }

  /**
   * Search models by query
   *
   * @param query - Search query
   * @returns Matching models sorted by relevance
   */
  async searchModels(query: string): Promise<GatewayModelInfo[]> {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    const allModels = await this.getModels();

    // Score and filter models
    const scored = allModels
      .map((m) => ({
        model: m,
        score: this.calculateRelevanceScore(m, lowerQuery),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((s) => s.model);
  }

  /**
   * Force refresh the registry
   */
  async refresh(): Promise<void> {
    this.cache.invalidate("all");
    // Invalidate all provider caches
    const models = await this.getModels();
    const providers = new Set(models.map((m) => m.provider.toLowerCase()));
    for (const provider of Array.from(providers)) {
      this.cache.invalidate(`provider:${provider}`);
    }
    logger.info("Registry refreshed");
  }

  /**
   * Fetch from all configured sources
   */
  private async fetchFromSources(): Promise<GatewayModelInfo[]> {
    const allResults: GatewayModelInfo[][] = [];
    const errors: Error[] = [];

    // Sort sources by priority (lower = higher priority)
    const sortedSources = [...this.config.sources].sort(
      (a, b) => a.priority - b.priority,
    );

    // Fetch from all sources in parallel
    const fetchPromises = sortedSources.map(async (source) => {
      try {
        const models = await this.fetchFromSource(source);
        logger.debug(`Fetched ${models.length} models from ${source.name}`);
        return { source: source.name, models };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Failed to fetch from ${source.name}: ${err.message}`);
        errors.push(err);
        return { source: source.name, models: [] };
      }
    });

    const results = await Promise.all(fetchPromises);

    // Collect results maintaining priority order
    for (const result of results) {
      if (result.models.length > 0) {
        allResults.push(result.models);
      }
    }

    // If all sources failed, throw an error
    if (allResults.length === 0 && errors.length > 0) {
      throw new RegistryFetchError(
        `All registry sources failed: ${errors.map((e) => e.message).join("; ")}`,
        {
          originalError: errors[0],
        },
      );
    }

    // Merge and deduplicate
    const merged = mergeModelSources(allResults);
    logger.info(
      `Registry loaded: ${merged.length} models from ${allResults.length} sources`,
    );

    return merged;
  }

  /**
   * Fetch from a single source
   */
  private async fetchFromSource(
    source: RegistrySource,
  ): Promise<GatewayModelInfo[]> {
    const proxyFetch = createProxyFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REGISTRY_FETCH_TIMEOUT_MS,
    );

    try {
      const response = await proxyFetch(source.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "NeuroLink/1.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new RegistryFetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          {
            source: source.name,
            url: source.url,
            statusCode: response.status,
          },
        );
      }

      const data = await response.json();
      return this.parseResponse(data, source);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof RegistryFetchError) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      throw new RegistryFetchError(`Fetch failed: ${err.message}`, {
        source: source.name,
        url: source.url,
        originalError: err,
      });
    }
  }

  /**
   * Parse response based on source parser type
   */
  private parseResponse(
    data: unknown,
    source: RegistrySource,
  ): GatewayModelInfo[] {
    switch (source.parser) {
      case "models.dev":
        return parseModelsDevResponse(data);
      case "openrouter":
        return parseOpenRouterResponse(data);
      case "custom":
        logger.warn(`Custom parser not implemented for ${source.name}`);
        return [];
      default:
        logger.warn(`Unknown parser: ${source.parser}`);
        return [];
    }
  }

  /**
   * Calculate relevance score for search
   */
  private calculateRelevanceScore(
    model: GatewayModelInfo,
    query: string,
  ): number {
    let score = 0;
    const fields = [
      { value: model.id, weight: 10 },
      { value: model.modelName, weight: 8 },
      { value: model.displayName, weight: 6 },
      { value: model.provider, weight: 5 },
      { value: model.description, weight: 2 },
    ];

    for (const field of fields) {
      if (field.value) {
        const lower = field.value.toLowerCase();
        if (lower === query) {
          score += field.weight * 2; // Exact match bonus
        } else if (lower.includes(query)) {
          score += field.weight;
        }
      }
    }

    // Check aliases
    if (model.aliases) {
      for (const alias of model.aliases) {
        if (alias.toLowerCase().includes(query)) {
          score += 4;
        }
      }
    }

    return score;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Singleton instance for global usage
let globalFetcher: RegistryFetcher | null = null;

/**
 * Get the global registry fetcher instance
 */
export function getGlobalFetcher(): RegistryFetcher {
  if (!globalFetcher) {
    globalFetcher = new RegistryFetcher();
  }
  return globalFetcher;
}

/**
 * Reset the global fetcher (mainly for testing)
 */
export function resetGlobalFetcher(): void {
  globalFetcher = null;
}

// Re-export for convenience
export { RegistryFetcher as registryFetcher };
