/**
 * Retry and Circuit Breaker Constants for NeuroLink
 *
 * Centralized retry configuration to replace magic numbers throughout the codebase.
 * Includes retry attempts, delays, backoff strategies, and circuit breaker settings.
 *
 * @fileoverview Retry and resilience constants for robust error handling
 * @author NeuroLink Team
 * @version 1.0.0
 */

/**
 * Retry attempt configuration
 * Balanced for reliability vs performance across different operation types
 */
export const RETRY_ATTEMPTS = {
  /** Default retry attempts for most operations */
  DEFAULT: 3, // 3 attempts - Balance reliability vs speed

  /** Critical operations that must succeed */
  CRITICAL: 5, // 5 attempts - High-importance operations

  /** Quick operations that should fail fast */
  QUICK: 2, // 2 attempts - Fast operations, minimal retry

  /** Network operations prone to transient failures */
  NETWORK: 4, // 4 attempts - Network operations

  /** Authentication operations */
  AUTH: 2, // 2 attempts - Auth should fail fast for security

  /** Database operations */
  DATABASE: 3, // 3 attempts - Standard DB operations

  /** File I/O operations */
  FILE_IO: 2, // 2 attempts - File operations
} as const;

/**
 * Retry delay configuration
 * Configured to prevent overwhelming services while providing quick recovery
 */
export const RETRY_DELAYS = {
  /** Base delay for exponential backoff */
  BASE_MS: 1000, // 1s - Starting delay

  /** Minimum delay between retries */
  MIN_MS: 500, // 500ms - Minimum wait time

  /** Maximum delay between retries */
  MAX_MS: 30000, // 30s - Maximum wait time

  /** Quick retry delay for fast operations */
  QUICK_MS: 200, // 200ms - Fast retry for quick operations

  /** Network operation base delay */
  NETWORK_BASE_MS: 2000, // 2s - Network-specific base delay

  /** Authentication delay (security consideration) */
  AUTH_MS: 3000, // 3s - Auth retry delay for security
} as const;

/**
 * Exponential backoff configuration
 * Controls how delays increase with each retry attempt
 */
export const BACKOFF_CONFIG = {
  /** Standard exponential multiplier */
  MULTIPLIER: 2, // 2x - Standard exponential backoff

  /** Conservative multiplier for sensitive operations */
  CONSERVATIVE_MULTIPLIER: 1.5, // 1.5x - Gentler backoff

  /** Aggressive multiplier for operations that should back off quickly */
  AGGRESSIVE_MULTIPLIER: 3, // 3x - Rapid backoff

  /** Jitter factor to prevent thundering herd */
  JITTER_FACTOR: 0.1, // 10% - Random jitter

  /** Maximum jitter amount in milliseconds */
  MAX_JITTER_MS: 1000, // 1s - Cap on random jitter
} as const;

/**
 * Circuit breaker configuration
 * Prevents cascading failures and provides automatic recovery
 */
export const CIRCUIT_BREAKER = {
  /** Failure threshold before opening circuit */
  FAILURE_THRESHOLD: 5, // 5 failures - Balance sensitivity vs stability

  /** Success threshold for closing circuit from half-open */
  SUCCESS_THRESHOLD: 3, // 3 successes - Confirm recovery

  /** Minimum calls before calculating failure rate */
  MIN_CALLS: 10, // 10 calls - Statistical significance

  /** Failure rate threshold (0.0 to 1.0) */
  FAILURE_RATE_THRESHOLD: 0.5, // 50% - Failure rate to open circuit

  /** Monitoring window for failure tracking */
  MONITORING_WINDOW_MS: 300000, // 5m - Sliding window for statistics

  /** Half-open max calls for testing recovery */
  HALF_OPEN_MAX_CALLS: 3, // 3 calls - Limited test calls
} as const;

/**
 * Provider-specific retry configuration
 * Different providers may need different retry strategies
 */
export const PROVIDER_RETRY = {
  /** OpenAI retry configuration */
  OPENAI: {
    maxAttempts: RETRY_ATTEMPTS.DEFAULT,
    baseDelay: RETRY_DELAYS.BASE_MS,
    maxDelay: RETRY_DELAYS.MAX_MS,
    multiplier: BACKOFF_CONFIG.MULTIPLIER,
  },

  /** Anthropic retry configuration */
  ANTHROPIC: {
    maxAttempts: RETRY_ATTEMPTS.DEFAULT,
    baseDelay: RETRY_DELAYS.BASE_MS,
    maxDelay: RETRY_DELAYS.MAX_MS,
    multiplier: BACKOFF_CONFIG.CONSERVATIVE_MULTIPLIER, // More conservative
  },

  /** Google (Vertex/Google AI) retry configuration */
  GOOGLE: {
    maxAttempts: RETRY_ATTEMPTS.NETWORK,
    baseDelay: RETRY_DELAYS.NETWORK_BASE_MS,
    maxDelay: RETRY_DELAYS.MAX_MS,
    multiplier: BACKOFF_CONFIG.MULTIPLIER,
  },

  /** AWS Bedrock retry configuration */
  BEDROCK: {
    maxAttempts: RETRY_ATTEMPTS.CRITICAL,
    baseDelay: RETRY_DELAYS.BASE_MS,
    maxDelay: RETRY_DELAYS.MAX_MS,
    multiplier: BACKOFF_CONFIG.CONSERVATIVE_MULTIPLIER,
  },

  /** Azure OpenAI retry configuration */
  AZURE: {
    maxAttempts: RETRY_ATTEMPTS.DEFAULT,
    baseDelay: RETRY_DELAYS.BASE_MS,
    maxDelay: RETRY_DELAYS.MAX_MS,
    multiplier: BACKOFF_CONFIG.MULTIPLIER,
  },

  /** Ollama retry configuration (local service) */
  OLLAMA: {
    maxAttempts: RETRY_ATTEMPTS.QUICK,
    baseDelay: RETRY_DELAYS.QUICK_MS,
    maxDelay: 5000, // 5s max for local service
    multiplier: BACKOFF_CONFIG.CONSERVATIVE_MULTIPLIER,
  },
} as const;

/**
 * Operation-specific retry configuration
 * Different operations may require different retry strategies
 */
export const OPERATION_RETRY = {
  /** Tool execution retry config */
  TOOL_EXECUTION: {
    maxAttempts: RETRY_ATTEMPTS.DEFAULT,
    baseDelay: RETRY_DELAYS.BASE_MS,
    circuitBreaker: true,
  },

  /** MCP operation retry config */
  MCP_OPERATION: {
    maxAttempts: RETRY_ATTEMPTS.QUICK,
    baseDelay: RETRY_DELAYS.QUICK_MS,
    circuitBreaker: false, // MCP operations are usually fast
  },

  /** Network request retry config */
  NETWORK_REQUEST: {
    maxAttempts: RETRY_ATTEMPTS.NETWORK,
    baseDelay: RETRY_DELAYS.NETWORK_BASE_MS,
    circuitBreaker: true,
  },

  /** Database operation retry config */
  DATABASE_OPERATION: {
    maxAttempts: RETRY_ATTEMPTS.DATABASE,
    baseDelay: RETRY_DELAYS.BASE_MS,
    circuitBreaker: true,
  },

  /** Authentication retry config */
  AUTHENTICATION: {
    maxAttempts: RETRY_ATTEMPTS.AUTH,
    baseDelay: RETRY_DELAYS.AUTH_MS,
    circuitBreaker: false, // Don't circuit break auth for security
  },
} as const;

/**
 * Retry utility functions
 */
export const RetryUtils = {
  /**
   * Calculate exponential backoff delay
   * @param attempt - Current attempt number (0-based)
   * @param baseDelay - Base delay in milliseconds
   * @param multiplier - Exponential multiplier
   * @param maxDelay - Maximum delay cap
   * @param jitter - Whether to add random jitter
   * @returns Calculated delay in milliseconds
   */
  calculateBackoffDelay: (
    attempt: number,
    baseDelay: number = RETRY_DELAYS.BASE_MS,
    multiplier: number = BACKOFF_CONFIG.MULTIPLIER,
    maxDelay: number = RETRY_DELAYS.MAX_MS,
    jitter: boolean = true,
  ): number => {
    const safeAttempt = Math.max(0, attempt);
    const base = Math.max(baseDelay, RETRY_DELAYS.MIN_MS);
    const delay = Math.min(base * Math.pow(multiplier, safeAttempt), maxDelay);
    if (!jitter) {
      return delay;
    }
    const jitterCap = Math.min(
      BACKOFF_CONFIG.MAX_JITTER_MS,
      delay * BACKOFF_CONFIG.JITTER_FACTOR,
    );
    return Math.min(maxDelay, Math.floor(delay + Math.random() * jitterCap));
  },

  /**
   * Check if an error is retriable
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  isRetriableError: (error: Error | unknown): boolean => {
    if (!error) {
      return false;
    }

    const err = error as Record<string, unknown>;

    // Network/system codes
    const code: string | undefined =
      typeof err?.code === "string" ? err.code : undefined;
    if (
      code &&
      ["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code)
    ) {
      return true;
    }

    // HTTP status
    const status: number | undefined =
      typeof err?.status === "number"
        ? err.status
        : typeof err?.statusCode === "number"
          ? err.statusCode
          : undefined;
    if (
      typeof status === "number" &&
      (status >= 500 || status === 429 || status === 408)
    ) {
      return true;
    }

    // Messages
    const msg: string =
      typeof err?.message === "string" ? err.message.toLowerCase() : "";
    if (
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("throttle")
    ) {
      return true;
    }
    if (msg.includes("timeout")) {
      return true;
    }

    return false;
  },

  /**
   * Get retry configuration for a specific provider
   * @param provider - Provider name
   * @returns Retry configuration object
   */
  getProviderRetryConfig: (provider: string) => {
    const normalizedProvider = provider.toLowerCase().replace(/[-_]/g, "");

    switch (normalizedProvider) {
      case "openai":
        return PROVIDER_RETRY.OPENAI;
      case "anthropic":
        return PROVIDER_RETRY.ANTHROPIC;
      case "googleai":
      case "vertex":
        return PROVIDER_RETRY.GOOGLE;
      case "bedrock":
        return PROVIDER_RETRY.BEDROCK;
      case "azure":
        return PROVIDER_RETRY.AZURE;
      case "ollama":
        return PROVIDER_RETRY.OLLAMA;
      default:
        return {
          maxAttempts: RETRY_ATTEMPTS.DEFAULT,
          baseDelay: RETRY_DELAYS.BASE_MS,
          maxDelay: RETRY_DELAYS.MAX_MS,
          multiplier: BACKOFF_CONFIG.MULTIPLIER,
        };
    }
  },
} as const;

// Legacy compatibility exports
export const DEFAULT_RETRY_ATTEMPTS = RETRY_ATTEMPTS.DEFAULT;
export const DEFAULT_INITIAL_DELAY = RETRY_DELAYS.BASE_MS;
export const DEFAULT_MAX_DELAY = RETRY_DELAYS.MAX_MS;
export const DEFAULT_BACKOFF_MULTIPLIER = BACKOFF_CONFIG.MULTIPLIER;
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD =
  CIRCUIT_BREAKER.FAILURE_THRESHOLD;
// Single source of truth: re-export from timeouts
export { CIRCUIT_BREAKER_RESET_MS } from "./timeouts.js";
