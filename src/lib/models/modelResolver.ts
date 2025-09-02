/**
 * Model Resolver for NeuroLink CLI Commands
 * Provides model resolution, search, and recommendation functionality
 * Part of Phase 4.1 - Models Command System
 */

import { AIProviderName } from "../types/index.js";
import type { JsonValue } from "../types/common.js";
import {
  MODEL_REGISTRY,
  MODEL_ALIASES,
  USE_CASE_RECOMMENDATIONS,
  type ModelInfo,
  type ModelSearchFilters,
  type ModelSearchResult,
  type ModelCapabilities,
  type UseCaseSuitability,
  getAllModels,
  getModelById,
  getModelsByProvider,
  getAvailableProviders,
  calculateCost,
  formatModelForDisplay,
} from "./modelRegistry.js";
import { isNonNullObject } from "../utils/typeUtils.js";

/**
 * Model recommendation context
 */
export interface RecommendationContext {
  useCase?: keyof UseCaseSuitability;
  maxCost?: number;
  minQuality?: "low" | "medium" | "high";
  requireCapabilities?: (keyof ModelCapabilities)[];
  excludeProviders?: AIProviderName[];
  contextSize?: number;
  preferLocal?: boolean;
}

/**
 * Model recommendation result
 */
export interface ModelRecommendation {
  model: ModelInfo;
  score: number;
  reasoning: string[];
  alternatives: ModelInfo[];
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  models: ModelInfo[];
  comparison: {
    capabilities: Record<keyof ModelCapabilities, ModelInfo[]>;
    pricing: { cheapest: ModelInfo; mostExpensive: ModelInfo };
    performance: Record<string, ModelInfo[]>;
    contextSize: { largest: ModelInfo; smallest: ModelInfo };
  };
}

/**
 * Model resolver class with advanced search and recommendation functionality
 */
export class ModelResolver {
  /**
   * Resolve model ID from alias or fuzzy name
   */
  static resolveModel(query: string): ModelInfo | null {
    const normalizedQuery = query.toLowerCase().trim();

    // Exact match first
    if (MODEL_REGISTRY[query]) {
      return MODEL_REGISTRY[query];
    }

    // Alias match
    if (MODEL_ALIASES[normalizedQuery]) {
      const resolvedId = MODEL_ALIASES[normalizedQuery];
      return MODEL_REGISTRY[resolvedId] || null;
    }

    // Fuzzy matching
    const allModels = getAllModels();

    // Try partial matching on ID
    const idMatch = allModels.find(
      (model) =>
        model.id.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(model.id.toLowerCase()),
    );
    if (idMatch) {
      return idMatch;
    }

    // Try partial matching on name
    const nameMatch = allModels.find(
      (model) =>
        model.name.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(model.name.toLowerCase()),
    );
    if (nameMatch) {
      return nameMatch;
    }

    // Try provider-specific matching
    const providerMatch = allModels.find((model) => {
      const providerQuery = `${model.provider}-${normalizedQuery}`;
      return (
        model.id.toLowerCase().includes(providerQuery) ||
        model.name.toLowerCase().includes(normalizedQuery)
      );
    });
    if (providerMatch) {
      return providerMatch;
    }

    return null;
  }

  /**
   * Search models with advanced filtering
   */
  static searchModels(filters: ModelSearchFilters): ModelSearchResult[] {
    const allModels = getAllModels();
    const results: ModelSearchResult[] = [];

    for (const model of allModels) {
      const matchResult = this.evaluateModelMatch(model, filters);
      if (matchResult.score > 0) {
        results.push(matchResult);
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get best model for specific use case
   */
  static getBestModel(context: RecommendationContext): ModelRecommendation {
    const allModels = getAllModels();
    const scored = allModels.map((model) => ({
      model,
      score: this.scoreModelForContext(model, context),
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4).map((s) => s.model);

    return {
      model: best.model,
      score: best.score,
      reasoning: this.generateRecommendationReasoning(best.model, context),
      alternatives,
    };
  }

  /**
   * Compare multiple models
   */
  static compareModels(modelIds: string[]): ModelComparison {
    const models = modelIds
      .map((id) => this.resolveModel(id))
      .filter((model): model is ModelInfo => model !== null);

    if (models.length === 0) {
      throw new Error(
        `No valid models found for comparison. Invalid IDs: ${modelIds.join(", ")}. Use 'models list' to see available model IDs.`,
      );
    }

    // Build comparison data
    const capabilities: Record<keyof ModelCapabilities, ModelInfo[]> = {
      vision: [],
      functionCalling: [],
      codeGeneration: [],
      reasoning: [],
      multimodal: [],
      streaming: [],
      jsonMode: [],
    };

    // Group models by capabilities
    for (const model of models) {
      for (const [capability, supported] of Object.entries(
        model.capabilities,
      )) {
        if (supported) {
          capabilities[capability as keyof ModelCapabilities].push(model);
        }
      }
    }

    // Find pricing extremes
    const sortedByCost = [...models].sort(
      (a, b) =>
        a.pricing.inputCostPer1K +
        a.pricing.outputCostPer1K -
        (b.pricing.inputCostPer1K + b.pricing.outputCostPer1K),
    );

    // Find context size extremes
    const sortedByContext = [...models].sort(
      (a, b) => b.limits.maxContextTokens - a.limits.maxContextTokens,
    );

    // Group by performance
    const performance = {
      fast: models.filter((m) => m.performance.speed === "fast"),
      medium: models.filter((m) => m.performance.speed === "medium"),
      slow: models.filter((m) => m.performance.speed === "slow"),
      highQuality: models.filter((m) => m.performance.quality === "high"),
      mediumQuality: models.filter((m) => m.performance.quality === "medium"),
      lowQuality: models.filter((m) => m.performance.quality === "low"),
    };

    return {
      models,
      comparison: {
        capabilities,
        pricing: {
          cheapest: sortedByCost[0],
          mostExpensive: sortedByCost[sortedByCost.length - 1],
        },
        performance,
        contextSize: {
          largest: sortedByContext[0],
          smallest: sortedByContext[sortedByContext.length - 1],
        },
      },
    };
  }

  /**
   * Get models by category
   */
  static getModelsByCategory(category: ModelInfo["category"]): ModelInfo[] {
    return getAllModels().filter((model) => model.category === category);
  }

  /**
   * Get recommended models for use case
   */
  static getRecommendedModelsForUseCase(useCase: string): ModelInfo[] {
    const recommendedIds = USE_CASE_RECOMMENDATIONS[useCase] || [];
    return recommendedIds
      .map((id) => getModelById(id))
      .filter((model): model is ModelInfo => model !== null);
  }

  /**
   * Calculate cost comparison for models
   */
  static calculateCostComparison(
    models: ModelInfo[],
    input: number = 1000,
    output: number = 500,
  ): Array<{ model: ModelInfo; cost: number; costPer1K: number }> {
    return models
      .map((model) => ({
        model,
        cost: calculateCost(model, input, output),
        costPer1K: model.pricing.inputCostPer1K + model.pricing.outputCostPer1K,
      }))
      .sort((a, b) => a.cost - b.cost);
  }

  /**
   * Get model statistics
   */
  static getModelStatistics(): JsonValue {
    const allModels = getAllModels();
    const providers = getAvailableProviders();

    // Count by provider
    const byProvider = providers.reduce(
      (acc, provider) => {
        acc[provider] = getModelsByProvider(provider).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Count by category
    const byCategory = allModels.reduce(
      (acc, model) => {
        acc[model.category] = (acc[model.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Capability statistics
    const capabilityStats = allModels.reduce(
      (acc, model) => {
        for (const [capability, supported] of Object.entries(
          model.capabilities,
        )) {
          if (supported) {
            acc[capability] = (acc[capability] || 0) + 1;
          }
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Cost statistics
    const costs = allModels.map(
      (m) => m.pricing.inputCostPer1K + m.pricing.outputCostPer1K,
    );
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    return {
      total: allModels.length,
      providers: Object.keys(byProvider).length,
      byProvider,
      byCategory,
      capabilities: capabilityStats,
      pricing: {
        average: avgCost,
        min: minCost,
        max: maxCost,
        free: allModels.filter((m) => m.pricing.inputCostPer1K === 0).length,
      },
      deprecated: allModels.filter((m) => m.deprecated).length,
    };
  }

  /**
   * Evaluate how well a model matches search filters
   */
  private static evaluateModelMatch(
    model: ModelInfo,
    filters: ModelSearchFilters,
  ): ModelSearchResult {
    let score = 0;
    const matchReasons: string[] = [];

    // Provider filter
    if (filters.provider) {
      const providers = Array.isArray(filters.provider)
        ? filters.provider
        : [filters.provider];
      if (providers.includes(model.provider)) {
        score += 10;
        matchReasons.push(`Provider: ${model.provider}`);
      } else {
        return { model, score: 0, matchReasons: [] };
      }
    }

    // Capability filter
    if (filters.capability) {
      const capabilities = Array.isArray(filters.capability)
        ? filters.capability
        : [filters.capability];
      for (const capability of capabilities) {
        if (model.capabilities[capability]) {
          score += 15;
          matchReasons.push(`Has capability: ${capability}`);
        }
      }
    }

    // Use case filter
    if (filters.useCase) {
      const useCaseScore = model.useCases[filters.useCase];
      if (useCaseScore >= 7) {
        score += useCaseScore * 2;
        matchReasons.push(`Good for ${filters.useCase} (${useCaseScore}/10)`);
      }
    }

    // Cost filter
    if (filters.maxCost) {
      const totalCost =
        model.pricing.inputCostPer1K + model.pricing.outputCostPer1K;
      if (totalCost <= filters.maxCost) {
        score += 5;
        matchReasons.push(`Within cost limit ($${totalCost.toFixed(6)}/1K)`);
      } else {
        score -= 5;
      }
    }

    // Context size filters
    if (
      filters.minContextSize &&
      model.limits.maxContextTokens >= filters.minContextSize
    ) {
      score += 5;
      matchReasons.push(`Meets min context: ${model.limits.maxContextTokens}`);
    }

    if (
      filters.maxContextSize &&
      model.limits.maxContextTokens <= filters.maxContextSize
    ) {
      score += 3;
      matchReasons.push(`Within max context: ${model.limits.maxContextTokens}`);
    }

    // Performance filters
    if (filters.performance) {
      if (
        model.performance.speed === filters.performance ||
        model.performance.quality === filters.performance
      ) {
        score += 8;
        matchReasons.push(`Performance: ${filters.performance}`);
      }
    }

    // Category filter
    if (filters.category) {
      const categories = Array.isArray(filters.category)
        ? filters.category
        : [filters.category];
      if (categories.includes(model.category)) {
        score += 7;
        matchReasons.push(`Category: ${model.category}`);
      }
    }

    // Base relevance score
    if (score === 0) {
      score = 1; // Minimal relevance for model
      matchReasons.push("Basic match");
    }

    return { model, score, matchReasons };
  }

  /**
   * Score model for recommendation context
   */
  private static scoreModelForContext(
    model: ModelInfo,
    context: RecommendationContext,
  ): number {
    let score = 0;

    // Use case scoring
    if (context.useCase) {
      score += model.useCases[context.useCase] * 10;
    }

    // Cost scoring
    if (context.maxCost) {
      const totalCost =
        model.pricing.inputCostPer1K + model.pricing.outputCostPer1K;
      if (totalCost <= context.maxCost) {
        score += 20;
      } else {
        score -= 30; // Heavy penalty for exceeding cost
      }
    }

    // Quality scoring
    if (context.minQuality) {
      const qualityScore =
        context.minQuality === "high"
          ? 3
          : context.minQuality === "medium"
            ? 2
            : 1;
      const modelQuality =
        model.performance.quality === "high"
          ? 3
          : model.performance.quality === "medium"
            ? 2
            : 1;
      if (modelQuality >= qualityScore) {
        score += 15;
      } else {
        score -= 10;
      }
    }

    // Required capabilities
    if (context.requireCapabilities) {
      for (const capability of context.requireCapabilities) {
        if (model.capabilities[capability]) {
          score += 12;
        } else {
          score -= 25; // Heavy penalty for missing required capability
        }
      }
    }

    // Provider exclusions
    if (context.excludeProviders?.includes(model.provider)) {
      score -= 50;
    }

    // Context size requirements
    if (
      context.contextSize &&
      model.limits.maxContextTokens >= context.contextSize
    ) {
      score += 10;
    }

    // Local preference
    if (context.preferLocal && model.isLocal) {
      score += 15;
    }

    // Deprecated models penalty
    if (model.deprecated) {
      score -= 20;
    }

    return Math.max(0, score); // Ensure non-negative score
  }

  /**
   * Generate recommendation reasoning
   */
  private static generateRecommendationReasoning(
    model: ModelInfo,
    context: RecommendationContext,
  ): string[] {
    const reasons: string[] = [];

    if (context.useCase) {
      const score = model.useCases[context.useCase];
      reasons.push(`Excellent for ${context.useCase} (${score}/10 rating)`);
    }

    if (model.pricing.inputCostPer1K === 0) {
      reasons.push("Free to use (local execution)");
    } else {
      const costPer1K =
        model.pricing.inputCostPer1K + model.pricing.outputCostPer1K;
      if (costPer1K < 0.001) {
        reasons.push("Very cost-effective");
      }
    }

    if (model.performance.quality === "high") {
      reasons.push("High-quality outputs");
    }

    if (model.performance.speed === "fast") {
      reasons.push("Fast response times");
    }

    if (model.limits.maxContextTokens > 100000) {
      reasons.push("Large context window for complex tasks");
    }

    const strongCapabilities = Object.entries(model.capabilities)
      .filter(([_, supported]) => supported)
      .map(([capability]) => capability);

    if (strongCapabilities.length > 0) {
      reasons.push(`Supports: ${strongCapabilities.join(", ")}`);
    }

    if (model.releaseDate) {
      const releaseYear = new Date(model.releaseDate).getFullYear();
      if (releaseYear >= 2024) {
        reasons.push("Recent model with latest capabilities");
      }
    }

    return reasons;
  }
}

/**
 * Utility functions for CLI integration
 */

/**
 * Format search results for CLI display
 */
export function formatSearchResults(results: ModelSearchResult[]): JsonValue {
  return results.map((result) => {
    const modelDisplay = formatModelForDisplay(result.model);
    return {
      ...(isNonNullObject(modelDisplay)
        ? (modelDisplay as Record<string, JsonValue>)
        : {}),
      relevanceScore: result.score,
      matchReasons: result.matchReasons,
    };
  });
}

/**
 * Format recommendation for CLI display
 */
export function formatRecommendation(
  recommendation: ModelRecommendation,
): JsonValue {
  return {
    recommended: formatModelForDisplay(recommendation.model),
    score: recommendation.score,
    reasoning: recommendation.reasoning,
    alternatives: recommendation.alternatives.map(formatModelForDisplay),
  };
}

/**
 * Format model comparison for CLI display
 */
export function formatComparison(comparison: ModelComparison): JsonValue {
  return {
    models: comparison.models.map(formatModelForDisplay),
    summary: {
      capabilities: Object.entries(comparison.comparison.capabilities).map(
        ([capability, models]) => ({
          capability,
          supportedBy: models.map((m) => m.id),
          count: models.length,
        }),
      ),
      pricing: {
        cheapest: comparison.comparison.pricing.cheapest.id,
        mostExpensive: comparison.comparison.pricing.mostExpensive.id,
      },
      contextSize: {
        largest: comparison.comparison.contextSize.largest.id,
        smallest: comparison.comparison.contextSize.smallest.id,
      },
      performance: Object.entries(comparison.comparison.performance).map(
        ([type, models]) => ({
          type,
          models: models.map((m) => m.id),
        }),
      ),
    },
  };
}
