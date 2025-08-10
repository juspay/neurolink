import type { ProviderModelConfig } from "./types.js";
import { modelConfig, type ProviderConfig } from "./modelConfiguration.js";

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
