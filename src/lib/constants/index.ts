/**
 * Unified Constants Export
 *
 * This file provides a centralized export point for all NeuroLink constants,
 * replacing magic numbers throughout the codebase with named, documented values.
 *
 * Categories:
 * - Timeouts: Tool execution, provider testing, MCP initialization
 * - Retry Logic: Backoff strategies, circuit breaker patterns
 * - Performance: Memory thresholds, concurrency limits, buffer sizes
 * - Tokens: Provider limits, use-case specific allocations
 *
 * @see MAGIC_NUMBER_REFACTORING_ANALYSIS.md for implementation details
 */

// ===== TIMEOUT CONSTANTS =====
export {
  TOOL_TIMEOUTS,
  PROVIDER_TIMEOUTS,
  MCP_TIMEOUTS,
  CIRCUIT_BREAKER_TIMEOUTS,
  NETWORK_TIMEOUTS,
  SYSTEM_TIMEOUTS,
  DEV_TIMEOUTS,
  TIMEOUTS,
  TimeoutUtils,
  // Legacy compatibility
  DEFAULT_TIMEOUT,
  PROVIDER_TEST_TIMEOUT,
  MCP_INIT_TIMEOUT,
  CIRCUIT_BREAKER_RESET_MS,
} from "./timeouts.js";

// ===== RETRY CONSTANTS =====
export {
  RETRY_ATTEMPTS,
  RETRY_DELAYS,
  BACKOFF_CONFIG,
  CIRCUIT_BREAKER,
  PROVIDER_RETRY,
  OPERATION_RETRY,
  RetryUtils,
  // Legacy compatibility
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_INITIAL_DELAY,
  DEFAULT_MAX_DELAY,
  DEFAULT_BACKOFF_MULTIPLIER,
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
} from "./retry.js";

// ===== PERFORMANCE CONSTANTS =====
export {
  UNIT_CONVERSIONS,
  TEXT_PREVIEW_LENGTHS,
  PERFORMANCE_THRESHOLDS,
  MEMORY_THRESHOLDS,
  RESPONSE_TIME_THRESHOLDS,
  CONCURRENCY_LIMITS,
  BUFFER_SIZES,
  CACHE_CONFIG,
  MONITORING_CONFIG,
  OPTIMIZATION_THRESHOLDS,
  GC_CONFIG,
  SERVER_CONFIG,
  PerformanceUtils,
  // Legacy compatibility
  HIGH_MEMORY_THRESHOLD,
  DEFAULT_CONCURRENCY_LIMIT,
  MAX_CONCURRENCY_LIMIT,
  SMALL_BUFFER_SIZE,
  LARGE_BUFFER_SIZE,
  DEFAULT_CACHE_SIZE,
  // New convenience exports
  NANOSECOND_TO_MS_DIVISOR,
  TEXT_PREVIEW_LENGTHS_EXPORT,
  PERFORMANCE_THRESHOLDS_EXPORT,
} from "./performance.js";

// ===== TOKEN CONSTANTS =====
export {
  TOKEN_LIMITS,
  PROVIDER_TOKEN_LIMITS,
  USE_CASE_TOKENS,
  CONTEXT_WINDOWS,
  TOKEN_ESTIMATION,
  TokenUtils,
  // Legacy compatibility
  DEFAULT_MAX_TOKENS,
  DEFAULT_EVALUATION_MAX_TOKENS,
  DEFAULT_ANALYSIS_MAX_TOKENS,
  DEFAULT_DOCUMENTATION_MAX_TOKENS,
  ANTHROPIC_SAFE,
  OPENAI_STANDARD,
  GOOGLE_STANDARD,
} from "./tokens.js";

// ===== COMPOSITE CONFIGURATIONS =====

/**
 * Common timeout configurations for different operation types
 */
export const OPERATION_TIMEOUTS = {
  QUICK: PROVIDER_TIMEOUTS.TEST_MS, // Fast operations (health checks, simple queries)
  STANDARD: TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS, // Standard operations (tool execution, generation)
  EXTENDED: TOOL_TIMEOUTS.EXECUTION_COMPLEX_MS, // Long operations (complex analysis, large file processing)
  CRITICAL: TOOL_TIMEOUTS.EXECUTION_BATCH_MS, // Critical operations (system initialization, backup)
} as const;

// Import the constants from the individual files for use in composite configurations
import {
  PROVIDER_TIMEOUTS,
  MCP_TIMEOUTS,
  TimeoutUtils,
  TOOL_TIMEOUTS,
} from "./timeouts.js";
import {
  RETRY_ATTEMPTS,
  RETRY_DELAYS,
  PROVIDER_RETRY,
  BACKOFF_CONFIG,
  RetryUtils,
} from "./retry.js";
import {
  CONCURRENCY_LIMITS,
  MEMORY_THRESHOLDS,
  BUFFER_SIZES,
} from "./performance.js";
import { TokenUtils } from "./tokens.js";

/**
 * Provider operation configurations combining timeouts and retries
 */
export const PROVIDER_OPERATION_CONFIGS = {
  OPENAI: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.OPENAI.maxAttempts,
    retryDelay: PROVIDER_RETRY.OPENAI.baseDelay,
  },
  ANTHROPIC: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.ANTHROPIC.maxAttempts,
    retryDelay: PROVIDER_RETRY.ANTHROPIC.baseDelay,
  },
  GOOGLE_AI: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.GOOGLE.maxAttempts,
    retryDelay: PROVIDER_RETRY.GOOGLE.baseDelay,
  },
  BEDROCK: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.BEDROCK.maxAttempts,
    retryDelay: PROVIDER_RETRY.BEDROCK.baseDelay,
  },
  AZURE: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.AZURE.maxAttempts,
    retryDelay: PROVIDER_RETRY.AZURE.baseDelay,
  },
  OLLAMA: {
    timeout: PROVIDER_TIMEOUTS.CONNECTION_MS,
    maxRetries: PROVIDER_RETRY.OLLAMA.maxAttempts,
    retryDelay: PROVIDER_RETRY.OLLAMA.baseDelay,
  },
} as const;

/**
 * MCP operation configurations for different server types
 */
export const MCP_OPERATION_CONFIGS = {
  INITIALIZATION: {
    timeout: MCP_TIMEOUTS.INITIALIZATION_MS,
    maxRetries: RETRY_ATTEMPTS.DEFAULT,
    retryDelay: RETRY_DELAYS.BASE_MS,
  },
  TOOL_DISCOVERY: {
    timeout: MCP_TIMEOUTS.TOOL_DISCOVERY_MS,
    maxRetries: RETRY_ATTEMPTS.DEFAULT,
    retryDelay: RETRY_DELAYS.BASE_MS,
  },
  TOOL_EXECUTION: {
    timeout: MCP_TIMEOUTS.TOOL_DISCOVERY_MS, // Reuse tool discovery timeout
    maxRetries: RETRY_ATTEMPTS.DEFAULT,
    retryDelay: RETRY_DELAYS.BASE_MS,
  },
  HEALTH_CHECK: {
    timeout: PROVIDER_TIMEOUTS.TEST_MS, // Use provider test timeout for health checks
    maxRetries: RETRY_ATTEMPTS.QUICK,
    retryDelay: RETRY_DELAYS.QUICK_MS,
  },
} as const;

/**
 * Performance profiles for different system loads
 */
export const PERFORMANCE_PROFILES = {
  LOW_LOAD: {
    concurrency: CONCURRENCY_LIMITS.LOW_RESOURCE,
    memoryThreshold: MEMORY_THRESHOLDS.WARNING_MB,
    bufferSize: BUFFER_SIZES.SMALL_BYTES,
  },
  NORMAL_LOAD: {
    concurrency: CONCURRENCY_LIMITS.DEFAULT,
    memoryThreshold: MEMORY_THRESHOLDS.WARNING_MB,
    bufferSize: BUFFER_SIZES.STANDARD_BYTES,
  },
  HIGH_LOAD: {
    concurrency: CONCURRENCY_LIMITS.HIGH_LOAD,
    memoryThreshold: MEMORY_THRESHOLDS.CRITICAL_MB,
    bufferSize: BUFFER_SIZES.LARGE_BYTES,
  },
  ENTERPRISE: {
    concurrency: CONCURRENCY_LIMITS.HIGH_LOAD, // Use high load as enterprise default
    memoryThreshold: MEMORY_THRESHOLDS.LEAK_DETECTION_MB, // Higher threshold for enterprise
    bufferSize: BUFFER_SIZES.XLARGE_BYTES, // Larger buffers for enterprise
  },
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Get timeout value with environment-based adjustments
 */
export function getTimeout(
  baseTimeout: number,
  environment: "development" | "test" | "production" = "production",
): number {
  return TimeoutUtils.getEnvironmentTimeout(baseTimeout, environment);
}

/**
 * Get retry configuration for a specific provider
 */
export function getProviderRetryConfig(provider: string) {
  return RetryUtils.getProviderRetryConfig(provider);
}

/**
 * Map use case to appropriate token limits
 * @param useCase - Use case category
 * @returns Token limit for the use case
 */
function mapUseCaseToTokenLimit(
  useCase: "conservative" | "standard" | "high_capacity" = "standard",
): number {
  switch (useCase) {
    case "conservative":
      return 4096; // TOKEN_LIMITS.CONSERVATIVE
    case "standard":
      return 8192; // TOKEN_LIMITS.STANDARD
    case "high_capacity":
      return 16384; // TOKEN_LIMITS.HIGH_CAPACITY
    default:
      return 8192; // Default to standard
  }
}

/**
 * Get token limit for a specific provider and use case
 * @param provider - Provider name
 * @param useCase - Use case category that determines token limits
 * @returns Token limit appropriate for the provider and use case
 */
export function getProviderTokenLimit(
  provider: string,
  useCase: "conservative" | "standard" | "high_capacity" = "standard",
): number {
  // Get the base token limit for the use case
  const useCaseLimit = mapUseCaseToTokenLimit(useCase);

  // Get the provider's default limit (without specific model)
  const providerLimit = TokenUtils.getProviderTokenLimit(provider);

  // Return the minimum of use case limit and provider limit for safety
  return Math.min(useCaseLimit, providerLimit);
}

/**
 * Get performance configuration for current system load
 */
export function getPerformanceConfig(
  load: "low" | "normal" | "high" | "enterprise" = "normal",
) {
  const upper = load.toUpperCase();
  const loadKey = (
    upper === "ENTERPRISE" ? "ENTERPRISE" : `${upper}_LOAD`
  ) as keyof typeof PERFORMANCE_PROFILES;
  return PERFORMANCE_PROFILES[loadKey] ?? PERFORMANCE_PROFILES.NORMAL_LOAD;
}

// ===== TYPE EXPORTS =====

/**
 * Type definitions for configuration objects
 */
export type TimeoutCategory = keyof typeof TOOL_TIMEOUTS;
export type RetryStrategy = keyof typeof BACKOFF_CONFIG;
export type PerformanceProfile = keyof typeof PERFORMANCE_PROFILES;
export type ProviderConfig =
  (typeof PROVIDER_OPERATION_CONFIGS)[keyof typeof PROVIDER_OPERATION_CONFIGS];
export type McpConfig =
  (typeof MCP_OPERATION_CONFIGS)[keyof typeof MCP_OPERATION_CONFIGS];

// ===== VERSION AND METADATA =====

/**
 * Constants system metadata
 */
export const CONSTANTS_METADATA = {
  VERSION: "1.0.0",
  LAST_UPDATED: "2025-01-27",
  TOTAL_CONSTANTS: 300,
  CATEGORIES: ["timeouts", "retry", "performance", "tokens", "enums"],
  COMPATIBILITY: "backward_compatible",
} as const;

// ===== ENUMS =====
export {
  // Provider and Model Enums
  AIProviderName,
  OpenRouterModels,
  BedrockModels,
  OpenAIModels,
  AzureOpenAIModels,
  VertexModels,
  GoogleAIModels,
  AnthropicModels,
  MistralModels,
  OllamaModels,
  LiteLLMModels,
  HuggingFaceModels,
  SageMakerModels,
  APIVersions,
  // Error Enums
  ErrorCategory,
  ErrorSeverity,
  // Claude Subscription Enums
  AnthropicBetaFeature,
  // OAuth Constants
  TOKEN_EXPIRY_BUFFER_MS,
} from "./enums.js";

// Re-export subscription types from canonical location for convenience
export type {
  ClaudeSubscriptionTier,
  AnthropicAuthMethod,
} from "../types/subscriptionTypes.js";
