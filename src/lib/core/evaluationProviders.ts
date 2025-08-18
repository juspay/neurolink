import type { ProviderModelConfig } from "./types.js";
import { modelConfig, type ProviderConfig } from "./modelConfiguration.js";

const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_SUCCESS_RATE: 0.95,
  EXCELLENT_RESPONSE_TIME_MS: 2000,
  GOOD_SUCCESS_RATE: 0.9,
  FAIR_SUCCESS_RATE: 0.8,
} as const;

/**
 * Real-time provider performance tracking interface
 */
interface ProviderPerformanceMetrics {
  responseTime: number[];
  successRate: number;
  tokenThroughput: number;
  costEfficiency: number;
  lastUpdated: Date;
  sampleCount: number;
}

const providerMetrics = new Map<string, ProviderPerformanceMetrics>();

/**
 * Convert new configuration format to legacy format for backwards compatibility
 */
function convertToLegacyFormat(config: ProviderConfig): ProviderModelConfig {
  return {
    provider: config.provider,
    models: config.models,
    costPerToken: config.defaultCost,
    requiresApiKey: config.requiredEnvVars,
    performance: config.performance,
  };
}

/**
 * Get all provider configurations using the new configuration system
 * Replaces hardcoded EVALUATION_PROVIDER_CONFIGS with configurable system
 */
function getEvaluationProviderConfigs(): Record<string, ProviderModelConfig> {
  const configs: Record<string, ProviderModelConfig> = {};
  const allConfigs = modelConfig.getAllConfigurations();

  for (const [provider, config] of allConfigs) {
    configs[provider] = convertToLegacyFormat(config);
  }

  return configs;
}

/**
 * Dynamic provider configurations for evaluation
 * Now uses configurable system instead of hardcoded values
 */
export const EVALUATION_PROVIDER_CONFIGS: Record<string, ProviderModelConfig> =
  getEvaluationProviderConfigs();

/**
 * Get provider configuration by name
 * Now uses the configurable system
 */
export function getProviderConfig(
  providerName: string,
): ProviderModelConfig | null {
  const config = modelConfig.getProviderConfig(providerName);
  return config ? convertToLegacyFormat(config) : null;
}

/**
 * Get all available providers with required API keys present
 * Now uses the configurable system
 */
export function getAvailableProviders(): ProviderModelConfig[] {
  return modelConfig
    .getAvailableProviders()
    .map((config) => convertToLegacyFormat(config));
}

/**
 * Sort providers by preference (cost, speed, quality)
 */
export function sortProvidersByPreference(
  providers: ProviderModelConfig[],
  preferCheap: boolean = true,
): ProviderModelConfig[] {
  return providers.sort((a, b) => {
    if (preferCheap) {
      // Cost > Speed > Quality for cheap preference
      if (a.performance.cost !== b.performance.cost) {
        return b.performance.cost - a.performance.cost;
      }
      if (a.performance.speed !== b.performance.speed) {
        return b.performance.speed - a.performance.speed;
      }
      return b.performance.quality - a.performance.quality;
    } else {
      // Quality > Speed > Cost for quality preference
      if (a.performance.quality !== b.performance.quality) {
        return b.performance.quality - a.performance.quality;
      }
      if (a.performance.speed !== b.performance.speed) {
        return b.performance.speed - a.performance.speed;
      }
      return b.performance.cost - a.performance.cost;
    }
  });
}

/**
 * Estimate cost for a specific provider and token usage
 * Now uses the configurable system
 */
export function estimateProviderCost(
  providerName: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const costInfo = modelConfig.getCostInfo(providerName);
  if (!costInfo) {
    return 0;
  }

  return inputTokens * costInfo.input + outputTokens * costInfo.output;
}

/**
 * Check if a provider is available (has required API keys)
 * Now uses the configurable system
 */
export function isProviderAvailable(providerName: string): boolean {
  return modelConfig.isProviderAvailable(providerName);
}

/**
 * Get the best available provider based on preference
 */
export function getBestAvailableProvider(
  preferCheap: boolean = true,
): ProviderModelConfig | null {
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    return null;
  }

  const sortedProviders = sortProvidersByPreference(
    availableProviders,
    preferCheap,
  );
  return sortedProviders[0];
}

/**
 Record actual provider performance for optimization
 */

export function recordProviderPerformanceFromMetrics(
  providerName: string,
  metrics: {
    responseTime: number;
    tokensGenerated: number;
    cost: number;
    success: boolean;
  },
): void {
  const existing = providerMetrics.get(providerName) || {
    responseTime: [],
    successRate: 0,
    tokenThroughput: 0,
    costEfficiency: 0,
    lastUpdated: new Date(),
    sampleCount: 0,
  };

  // Keep rolling window of last 50 response times
  existing.responseTime.push(metrics.responseTime);
  if (existing.responseTime.length > 50) {
    existing.responseTime.shift();
  }

  // Update success rate
  const totalSamples = existing.sampleCount + 1;
  existing.successRate =
    (existing.successRate * existing.sampleCount + (metrics.success ? 1 : 0)) /
    totalSamples;

  // Update throughput (tokens per second)
  if (metrics.responseTime > 0) {
    const tokensPerSecond =
      metrics.tokensGenerated / (metrics.responseTime / 1000);
    existing.tokenThroughput =
      (existing.tokenThroughput * existing.sampleCount + tokensPerSecond) /
      totalSamples;
  }
  // If responseTime is 0, skip updating tokenThroughput for this sample
  // but still update other metrics

  // Update cost efficiency (tokens per dollar)
  if (metrics.cost > 0) {
    const tokensPerDollar = metrics.tokensGenerated / metrics.cost;
    existing.costEfficiency =
      (existing.costEfficiency * existing.sampleCount + tokensPerDollar) /
      totalSamples;
  }

  existing.sampleCount = totalSamples;
  existing.lastUpdated = new Date();

  providerMetrics.set(providerName, existing);
}

/**
 * Get performance-optimized provider based on real metrics
 */
export function getPerformanceOptimizedProvider(
  priority: "speed" | "cost" | "reliability" = "speed",
): ProviderModelConfig | null {
  const availableProviders = getAvailableProviders();
  if (availableProviders.length === 0) {
    return null;
  }

  // Score providers based on real performance data
  const scoredProviders = availableProviders.map((provider) => {
    const metrics = providerMetrics.get(provider.provider);
    if (!metrics || metrics.sampleCount < 3) {
      // Fall back to static performance ratings for providers without data
      return {
        provider,
        score: getStaticPerformanceScore(provider, priority),
        metrics: null,
      };
    }

    let score = 0;
    switch (priority) {
      case "speed": {
        const avgResponseTime =
          metrics.responseTime.reduce((a, b) => a + b, 0) /
          metrics.responseTime.length;
        score =
          metrics.tokenThroughput * 0.6 +
          (5000 / Math.max(avgResponseTime, 100)) * 0.4;
        break;
      }
      case "cost": {
        score = metrics.costEfficiency * 0.7 + metrics.successRate * 0.3;
        break;
      }
      case "reliability": {
        score = metrics.successRate * 0.8 + (metrics.sampleCount / 100) * 0.2;
        break;
      }
    }

    return { provider, score, metrics };
  });

  // Sort by score and return best
  scoredProviders.sort((a, b) => b.score - a.score);
  return scoredProviders[0].provider;
}

/**
 * Helper function for providers without performance data
 */
function getStaticPerformanceScore(
  provider: ProviderModelConfig,
  priority: string,
): number {
  switch (priority) {
    case "speed": {
      const speedScore = provider.performance?.speed || 1;
      return speedScore;
    }
    case "cost": {
      const costScore = provider.performance?.cost || 1;
      return costScore;
    }
    case "reliability": {
      const qualityScore = provider.performance?.quality || 1;
      return qualityScore;
    }
    default: {
      throw new Error(
        `Invalid priority: "${priority}". Must be one of: speed, cost, reliability`,
      );
    }
  }
}

export function getProviderPerformanceAnalytics(): Record<
  string,
  {
    avgResponseTime: number;
    successRate: number;
    tokenThroughput: number;
    costEfficiency: number;
    recommendation: string;
    sampleCount: number;
  }
> {
  const analytics: Record<
    string,
    {
      avgResponseTime: number;
      successRate: number;
      tokenThroughput: number;
      costEfficiency: number;
      recommendation: string;
      sampleCount: number;
    }
  > = {};

  for (const [providerName, metrics] of providerMetrics.entries()) {
    if (metrics.sampleCount === 0) {
      continue;
    }

    const avgResponseTime =
      metrics.responseTime.reduce((a, b) => a + b, 0) /
      metrics.responseTime.length;

    let recommendation = "";
    if (
      metrics.successRate > PERFORMANCE_THRESHOLDS.EXCELLENT_SUCCESS_RATE &&
      avgResponseTime < PERFORMANCE_THRESHOLDS.EXCELLENT_RESPONSE_TIME_MS
    ) {
      recommendation = "Excellent - Recommended for production";
    } else if (metrics.successRate > PERFORMANCE_THRESHOLDS.GOOD_SUCCESS_RATE) {
      recommendation = "Good - Suitable for most tasks";
    } else if (metrics.successRate > PERFORMANCE_THRESHOLDS.FAIR_SUCCESS_RATE) {
      recommendation = "Fair - Monitor closely";
    } else {
      recommendation = "Poor - Consider alternative providers";
    }

    analytics[providerName] = {
      avgResponseTime,
      successRate: metrics.successRate,
      tokenThroughput: metrics.tokenThroughput,
      costEfficiency: metrics.costEfficiency,
      recommendation,
      sampleCount: metrics.sampleCount,
    };
  }

  return analytics;
}

/**
 * Reset performance metrics for a provider or all providers.
 * @param providerName - (Optional) The name of the provider to reset. If omitted, resets all providers.
 */
export function resetProviderMetrics(providerName?: string): void {
  if (providerName) {
    providerMetrics.delete(providerName);
  } else {
    providerMetrics.clear();
  }
}
