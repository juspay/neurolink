/**
 * Gateway Provider System Types
 *
 * Type definitions for the unified gateway provider supporting 69+ AI providers
 * through a single "provider/model" string format.
 */

import type { AIProviderName } from "../constants/enums.js";

/**
 * Gateway model information extending existing ModelInfo pattern
 */
export interface GatewayModelInfo {
  /** Full model ID in "provider/model-name" format */
  id: string;
  /** Provider identifier (e.g., "anthropic", "openai") */
  provider: string;
  /** Model name without provider prefix */
  modelName: string;
  /** Human-readable display name */
  displayName: string;
  /** Model description */
  description?: string;
  /** Maximum context window size in tokens */
  contextLength?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Pricing information */
  pricing?: GatewayPricing;
  /** Model capabilities */
  capabilities: GatewayCapabilities;
  /** Supported API parameters */
  supportedParameters?: string[];
  /** Whether the model is deprecated */
  deprecated?: boolean;
  /** Alternative names/aliases for the model */
  aliases?: string[];
}

/**
 * Pricing information per million tokens
 */
export interface GatewayPricing {
  /** Cost per 1 million input tokens in USD */
  inputPer1M: number;
  /** Cost per 1 million output tokens in USD */
  outputPer1M: number;
}

/**
 * Model capabilities
 */
export interface GatewayCapabilities {
  /** Supports chat/conversation format */
  chat: boolean;
  /** Supports text completion format */
  completion: boolean;
  /** Supports embeddings */
  embedding: boolean;
  /** Supports image input (vision) */
  imageInput: boolean;
  /** Supports image generation */
  imageOutput: boolean;
  /** Supports audio input */
  audioInput: boolean;
  /** Supports audio output */
  audioOutput: boolean;
  /** Supports video input */
  videoInput: boolean;
  /** Supports video output */
  videoOutput: boolean;
  /** Supports function/tool calling */
  functionCalling: boolean;
  /** Supports JSON mode output */
  jsonMode: boolean;
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports extended thinking/reasoning */
  thinking?: boolean;
}

/**
 * Provider configuration for routing
 */
export interface GatewayProviderConfig {
  /** Provider identifier */
  id: string;
  /** Display name */
  name: string;
  /** AI SDK package if direct support available */
  sdkPackage?: string;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Environment variable for API key */
  authEnvVar: string;
  /** Routing strategy to use */
  routing: RoutingStrategy;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;
  /** Whether this provider has direct SDK support in NeuroLink */
  supportsDirectRouting: boolean;
  /** Corresponding NeuroLink provider name if applicable */
  neuroLinkProviderName?: AIProviderName;
}

/**
 * Routing strategy for model requests
 */
export type RoutingStrategy =
  | "direct" // Route directly to provider API using native SDK
  | "openrouter" // Route via OpenRouter gateway
  | "litellm" // Route via LiteLLM proxy
  | "auto"; // Smart routing based on availability

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Requests per minute limit */
  requestsPerMinute: number;
  /** Tokens per minute limit */
  tokensPerMinute: number;
}

/**
 * Fallback configuration for automatic failover
 */
export interface FallbackConfig {
  /** Ordered list of fallback models */
  models: string[];
  /** Number of retries per model (default: 2) */
  retries: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs: number;
  /** Timeout per model attempt in milliseconds */
  timeout?: number;
}

/**
 * Registry configuration for model discovery
 */
export interface RegistryConfig {
  /** Registry sources to fetch from */
  sources: RegistrySource[];
  /** How often to refresh in milliseconds (default: 1 hour) */
  refreshIntervalMs: number;
  /** Whether caching is enabled */
  cacheEnabled: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
}

/**
 * External registry source configuration
 */
export interface RegistrySource {
  /** Source name for identification */
  name: string;
  /** API URL to fetch models from */
  url: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Parser type for the response format */
  parser: RegistryParser;
}

/**
 * Supported registry parser types
 */
export type RegistryParser = "models.dev" | "openrouter" | "custom";

/**
 * Gateway options for model creation
 */
export interface GatewayOptions {
  /** Model string or dynamic selector */
  model?: string | ModelSelector;
  /** Fallback configuration */
  fallback?: FallbackConfig;
  /** Explicit routing strategy override */
  routing?: RoutingStrategy;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Gateway provider options (constructor)
 */
export interface GatewayProviderOptions {
  /** Fallback configuration for automatic failover */
  fallback?: FallbackConfig;
  /** Override routing strategy */
  routing?: RoutingStrategy;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Dynamic model selector function
 */
export type ModelSelector = (context: ModelSelectorContext) => string;

/**
 * Context provided to model selector functions
 */
export interface ModelSelectorContext {
  /** Runtime context from NeuroLink instance */
  runtimeContext?: Map<string, unknown>;
  /** Request-specific context */
  requestContext?: Record<string, unknown>;
  /** List of available models */
  availableModels: string[];
}

/**
 * Parsed model string components
 */
export interface ParsedModel {
  /** Provider name (e.g., "anthropic") */
  provider: string;
  /** Model name (e.g., "claude-3-5-sonnet") */
  modelName: string;
}

/**
 * Cache entry for registry data
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttlMs: number;
}

/**
 * Cache options configuration
 */
export interface CacheOptions {
  /** Default TTL in milliseconds */
  defaultTtlMs: number;
  /** Maximum number of entries */
  maxEntries: number;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of entries */
  entries: number;
  /** Last cleanup timestamp */
  lastCleanup: number;
}

/**
 * Model search options
 */
export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: "relevance" | "name" | "provider" | "cost";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Model search filters
 */
export interface ModelSearchFilters {
  /** Filter by provider */
  provider?: string;
  /** Filter by minimum context length */
  minContextLength?: number;
  /** Filter by maximum cost per 1M tokens */
  maxCostPer1M?: number;
  /** Filter by required capabilities */
  capabilities?: (keyof GatewayCapabilities)[];
  /** Include deprecated models */
  includeDeprecated?: boolean;
}

/**
 * Model search result
 */
export interface ModelSearchResult extends GatewayModelInfo {
  /** Relevance score (0-1) */
  relevanceScore: number;
}

/**
 * Search constraints for best match finding
 */
export interface SearchConstraints {
  /** Maximum cost per 1M tokens */
  maxCost?: number;
  /** Minimum context length */
  minContextLength?: number;
  /** Required capabilities */
  requiredCapabilities?: (keyof GatewayCapabilities)[];
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  /** Models being compared */
  models: GatewayModelInfo[];
  /** Comparison summary */
  summary: {
    cheapest: string;
    mostCapable: string;
    largestContext: string;
    recommended: string;
  };
}

/**
 * Fallback attempt record
 */
export interface FallbackAttempt {
  /** Model string attempted */
  model: string;
  /** Attempt number (1-indexed) */
  attempt: number;
  /** Error if attempt failed */
  error?: Error;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Fallback execution result
 */
export interface FallbackResult<T> {
  /** The successful result */
  result: T;
  /** Model that produced the result */
  modelUsed: string;
  /** All attempts made */
  attempts: FallbackAttempt[];
}

/**
 * models.dev API response format
 */
export interface ModelsDevResponse {
  models: Array<{
    id: string;
    provider: string;
    name: string;
    description?: string;
    context_length?: number;
    max_output_tokens?: number;
    pricing?: { input: number; output: number };
    capabilities?: Record<string, boolean>;
    parameters?: string[];
  }>;
}

/**
 * OpenRouter API response format
 */
export interface OpenRouterModelsResponse {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt: string; completion: string };
    supported_parameters?: string[];
  }>;
}
