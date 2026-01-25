/**
 * Provider Mapper
 *
 * Maps providers to their routing strategies, SDK packages, and configuration.
 * Determines how to route requests based on available credentials and capabilities.
 */

import { logger } from "../utils/logger.js";
import {
  ALL_PROVIDER_CONFIGS,
  DIRECT_PROVIDER_CONFIGS,
  GATEWAY_PROVIDER_CONFIGS,
} from "./constants.js";
import { normalizeProviderName } from "./modelStringParser.js";
import type { GatewayProviderConfig, RoutingStrategy } from "./types.js";

/**
 * Get the complete provider mapping for a provider
 *
 * @param providerId - Provider identifier
 * @returns Provider mapping or undefined if not found
 */
export function getProviderMapping(
  providerId: string,
): GatewayProviderConfig | undefined {
  const normalized = normalizeProviderName(providerId);
  return ALL_PROVIDER_CONFIGS[normalized];
}

/**
 * Determine the optimal routing strategy for a provider
 * Takes into account:
 * - Whether provider has direct SDK support
 * - Whether required API key is configured
 * - Whether OpenRouter fallback is available
 *
 * @param providerId - Provider identifier
 * @returns Optimal routing strategy
 */
export function getRoutingStrategy(providerId: string): RoutingStrategy {
  const normalized = normalizeProviderName(providerId);
  const config = ALL_PROVIDER_CONFIGS[normalized];

  if (!config) {
    // Unknown provider - route via OpenRouter
    logger.debug(
      `Unknown provider "${providerId}", defaulting to openrouter routing`,
    );
    return "openrouter";
  }

  // Check if direct routing is possible
  if (config.supportsDirectRouting) {
    const hasApiKey = isProviderConfigured(normalized);
    if (hasApiKey) {
      logger.debug(
        `Provider "${providerId}" has direct SDK support and API key configured`,
      );
      return "direct";
    }

    // Has direct support but no API key - fall back to OpenRouter
    logger.debug(
      `Provider "${providerId}" supports direct routing but ${config.authEnvVar} not set, using openrouter`,
    );
    return "openrouter";
  }

  // No direct support - use configured routing (usually openrouter)
  return config.routing;
}

/**
 * Check if a provider has direct SDK support in NeuroLink
 *
 * @param providerId - Provider identifier
 * @returns True if provider has direct support
 */
export function hasDirectSupport(providerId: string): boolean {
  const normalized = normalizeProviderName(providerId);
  return normalized in DIRECT_PROVIDER_CONFIGS;
}

/**
 * Get the environment variable name for a provider's API key
 *
 * @param providerId - Provider identifier
 * @returns Environment variable name or undefined
 */
export function getAuthEnvVar(providerId: string): string | undefined {
  const config = getProviderMapping(providerId);
  return config?.authEnvVar;
}

/**
 * Check if a provider's API key is configured
 *
 * @param providerId - Provider identifier
 * @returns True if API key is set
 */
export function isProviderConfigured(providerId: string): boolean {
  const envVar = getAuthEnvVar(providerId);

  if (!envVar) {
    // Provider doesn't require auth (e.g., Ollama local)
    return true;
  }

  const value = process.env[envVar];
  return !!value && value.trim().length > 0;
}

/**
 * Check if OpenRouter is configured for gateway routing
 *
 * @returns True if OPENROUTER_API_KEY is set
 */
export function isOpenRouterConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY &&
    process.env.OPENROUTER_API_KEY.trim().length > 0
  );
}

/**
 * Check if LiteLLM is configured for gateway routing
 *
 * @returns True if LiteLLM is accessible
 */
export function isLiteLLMConfigured(): boolean {
  // LiteLLM is considered configured if base URL is set
  // The default localhost:4000 means local LiteLLM proxy
  return !!(process.env.LITELLM_BASE_URL || process.env.LITELLM_API_KEY);
}

/**
 * Get all providers that have direct SDK support
 *
 * @returns Array of provider IDs with direct support
 */
export function getDirectProviders(): string[] {
  return Object.keys(DIRECT_PROVIDER_CONFIGS);
}

/**
 * Get all providers that require gateway routing
 *
 * @returns Array of provider IDs requiring gateway
 */
export function getGatewayProviders(): string[] {
  return Object.keys(GATEWAY_PROVIDER_CONFIGS);
}

/**
 * Get all known providers
 *
 * @returns Array of all known provider IDs
 */
export function getAllKnownProviders(): string[] {
  return Object.keys(ALL_PROVIDER_CONFIGS);
}

/**
 * Get providers that are currently available (have credentials)
 *
 * @returns Array of available provider IDs
 */
export function getAvailableProviders(): string[] {
  return getAllKnownProviders().filter((id) => {
    if (hasDirectSupport(id)) {
      return isProviderConfigured(id);
    }
    // Gateway providers available if OpenRouter is configured
    return isOpenRouterConfigured();
  });
}

/**
 * Get the NeuroLink provider name mapping if available
 *
 * @param providerId - Gateway provider ID
 * @returns NeuroLink AIProviderName or undefined
 */
export function getNeuroLinkProviderName(
  providerId: string,
): string | undefined {
  const config = getProviderMapping(providerId);
  return config?.neuroLinkProviderName;
}

/**
 * Check if a provider should be routed directly to NeuroLink's existing provider
 *
 * @param providerId - Provider identifier
 * @returns True if should use NeuroLink's existing provider
 */
export function shouldUseNeuroLinkProvider(providerId: string): boolean {
  const config = getProviderMapping(providerId);
  return !!(
    config?.supportsDirectRouting &&
    config?.neuroLinkProviderName &&
    isProviderConfigured(providerId)
  );
}

/**
 * Provider routing decision summary
 */
export interface RoutingDecision {
  provider: string;
  strategy: RoutingStrategy;
  hasDirectSupport: boolean;
  isConfigured: boolean;
  neuroLinkProvider?: string;
  fallbackAvailable: boolean;
}

/**
 * Get detailed routing decision for a provider
 *
 * @param providerId - Provider identifier
 * @returns Routing decision with full context
 */
export function getRoutingDecision(providerId: string): RoutingDecision {
  const normalized = normalizeProviderName(providerId);
  const config = getProviderMapping(normalized);
  const hasDirect = hasDirectSupport(normalized);
  const isConfigured = isProviderConfigured(normalized);
  const strategy = getRoutingStrategy(normalized);

  return {
    provider: normalized,
    strategy,
    hasDirectSupport: hasDirect,
    isConfigured,
    neuroLinkProvider: config?.neuroLinkProviderName,
    fallbackAvailable: isOpenRouterConfigured(),
  };
}
