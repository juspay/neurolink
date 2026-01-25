/**
 * Gateway Provider System - Public API
 *
 * Unified access to 69+ AI providers through a single "provider/model" string format.
 *
 * @example Basic usage
 * ```typescript
 * import { GatewayProvider } from "@juspay/neurolink/gateway";
 *
 * const provider = new GatewayProvider("anthropic/claude-3-5-sonnet");
 * const result = await provider.generate({ prompt: "Hello!" });
 * ```
 *
 * @example With fallbacks
 * ```typescript
 * const provider = new GatewayProvider("openai/gpt-4o", undefined, {
 *   fallback: {
 *     models: ["anthropic/claude-3-5-sonnet", "google/gemini-1.5-pro"],
 *     retries: 2,
 *     retryDelayMs: 1000
 *   }
 * });
 * ```
 *
 * @example Dynamic model selection
 * ```typescript
 * const provider = new GatewayProvider(({ availableModels }) =>
 *   availableModels.includes("openai/gpt-4o") ? "openai/gpt-4o" : "openai/gpt-4o-mini"
 * );
 * ```
 *
 * @module gateway
 */

// ==================
// Constants
// ==================
export {
  ALL_PROVIDER_CONFIGS,
  API_TIMEOUT_MS,
  CACHE_TTL_MS,
  DEFAULT_FALLBACK_CONFIG,
  DEFAULT_GATEWAY_MODEL,
  DEFAULT_REGISTRY_SOURCES,
  DIRECT_PROVIDER_CONFIGS,
  GATEWAY_ENABLED,
  GATEWAY_PROVIDER_CONFIGS,
  LITELLM_CONFIG,
  MODEL_INFERENCE_PATTERNS,
  OPENROUTER_CONFIG,
  REGISTRY_FETCH_TIMEOUT_MS,
  REGISTRY_REFRESH_INTERVAL_MS,
} from "./constants.js";
// ==================
// Errors
// ==================
export {
  ConfigurationError,
  FallbackExhaustedError,
  GATEWAY_ERROR_CODES,
  GatewayDisabledError,
  GatewayError,
  type GatewayErrorCode,
  MissingApiKeyError,
  ModelNotFoundError,
  RegistryFetchError,
  RoutingError,
} from "./errors.js";
export {
  type FallbackManager,
  getGlobalFallbackManager,
} from "./fallbackManager.js";
// ==================
// Client Utilities
// ==================
export { GatewayClient, getGlobalGatewayClient } from "./gatewayClient.js";
// ==================
// Main Provider
// ==================
export { GatewayProvider } from "./gatewayProvider.js";
export { getGlobalRouter, type ModelRouter } from "./modelRouter.js";
// ==================
// Core Functions
// ==================
export {
  createModelString,
  getProviderConfig,
  hasProviderPrefix,
  inferProvider,
  isKnownProvider,
  normalizeModelName,
  normalizeProviderName,
  parseModelString,
  validateModelString,
} from "./modelStringParser.js";
export {
  getAllKnownProviders,
  getAuthEnvVar,
  getAvailableProviders,
  getDirectProviders,
  getGatewayProviders,
  getNeuroLinkProviderName,
  getProviderMapping,
  getRoutingDecision,
  getRoutingStrategy,
  hasDirectSupport,
  isLiteLLMConfigured,
  isOpenRouterConfigured,
  isProviderConfigured,
  type RoutingDecision,
  shouldUseNeuroLinkProvider,
} from "./providerMapper.js";
// ==================
// Registry & Cache
// ==================
export {
  getGlobalCache,
  RegistryCache,
  resetGlobalCache,
} from "./registryCache.js";
export {
  getGlobalFetcher,
  RegistryFetcher,
  resetGlobalFetcher,
} from "./registryFetcher.js";
export {
  mergeModelSources,
  parseModelsDevResponse,
  parseOpenRouterResponse,
} from "./registryParsers.js";
// ==================
// Types
// ==================
export type {
  // Cache
  CacheEntry,
  CacheOptions,
  CacheStats,
  // Fallback
  FallbackAttempt,
  FallbackConfig,
  FallbackResult,
  GatewayCapabilities,
  // Model information
  GatewayModelInfo,
  // Configuration
  GatewayOptions,
  GatewayPricing,
  GatewayProviderConfig,
  GatewayProviderOptions,
  ModelComparison,
  ModelSearchFilters,
  ModelSearchResult,
  // Dynamic selection
  ModelSelector,
  ModelSelectorContext,
  // External API responses
  ModelsDevResponse,
  OpenRouterModelsResponse,
  ParsedModel,
  RateLimitConfig,
  RegistryConfig,
  RegistryParser,
  RegistrySource,
  // Routing
  RoutingStrategy,
  SearchConstraints,
  // Search
  SearchOptions,
} from "./types.js";
