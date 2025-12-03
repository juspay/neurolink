/**
 * Performance and Resource Constants for NeuroLink
 *
 * Centralized performance configuration to replace magic numbers throughout the codebase.
 * Includes memory thresholds, concurrency limits, buffer sizes, and cache configurations.
 *
 * @fileoverview Performance constants for optimal resource utilization
 * @author NeuroLink Team
 * @version 1.0.0
 */

import { TIMEOUTS } from "./timeouts.js";

/**
 * Unit conversion constants
 * Common conversion factors to replace magic numbers
 */
export const UNIT_CONVERSIONS = {
  /** Conversion factor from nanoseconds to milliseconds */
  NANOSECOND_TO_MS_DIVISOR: 1000000, // 1,000,000 - Nanoseconds to milliseconds

  /** Conversion factor from microseconds to milliseconds */
  MICROSECOND_TO_MS_DIVISOR: 1000, // 1,000 - Microseconds to milliseconds

  /** Conversion factor from seconds to milliseconds */
  SECOND_TO_MS_MULTIPLIER: 1000, // 1,000 - Seconds to milliseconds

  /** Conversion factor from minutes to milliseconds */
  MINUTE_TO_MS_MULTIPLIER: 60000, // 60,000 - Minutes to milliseconds

  /** Conversion factor from hours to milliseconds */
  HOUR_TO_MS_MULTIPLIER: 3600000, // 3,600,000 - Hours to milliseconds
} as const;

/**
 * Text processing constants
 * Standard lengths for text preview, logging, and truncation
 */
export const TEXT_PREVIEW_LENGTHS = {
  /** Very short preview for debugging */
  VERY_SHORT: 50, // 50 chars - Very short preview

  /** Short preview for compact logging */
  SHORT: 100, // 100 chars - Short preview

  /** Medium preview for standard logging */
  MEDIUM: 150, // 150 chars - Medium preview

  /** Standard preview length */
  STANDARD: 200, // 200 chars - Standard preview

  /** Long preview for detailed context */
  LONG: 300, // 300 chars - Long preview

  /** Extra long preview for comprehensive view */
  EXTRA_LONG: 500, // 500 chars - Extra long preview

  /** Maximum preview length before truncation */
  MAX_PREVIEW: 1000, // 1000 chars - Maximum preview
} as const;

/**
 * Performance thresholds for various operations
 * Unified thresholds to replace scattered magic numbers
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Success rate threshold for tool reliability */
  SUCCESS_RATE_THRESHOLD: 0.8, // 80% - Minimum success rate

  /** High success rate threshold */
  HIGH_SUCCESS_RATE: 0.95, // 95% - High success rate

  /** Low success rate warning threshold */
  LOW_SUCCESS_RATE_WARNING: 0.6, // 60% - Low success rate warning

  /** Critical success rate threshold */
  CRITICAL_SUCCESS_RATE: 0.5, // 50% - Critical success rate

  /** Tool execution time warning threshold (ms) */
  TOOL_EXECUTION_WARNING_MS: 10000, // 10s - Tool execution warning

  /** Large tool collection threshold */
  LARGE_TOOL_COLLECTION: 100, // 100 tools - Large collection

  /** Circuit breaker failure threshold */
  CIRCUIT_BREAKER_FAILURES: 5, // 5 failures - Circuit breaker threshold

  /** Circuit breaker reset timeout (ms) */
  CIRCUIT_BREAKER_RESET_MS: TIMEOUTS.CIRCUIT_BREAKER.RESET_MS, // 60s - Circuit breaker reset
} as const;

/**
 * Memory threshold configuration
 * Thresholds for monitoring and alerting on memory usage
 */
export const MEMORY_THRESHOLDS = {
  /** Warning threshold for general memory usage */
  WARNING_MB: 100, // 100MB - Warn about high memory usage

  /** Critical threshold requiring immediate attention */
  CRITICAL_MB: 200, // 200MB - Critical memory usage

  /** Tool-specific memory warning threshold */
  TOOL_WARNING_MB: 20, // 20MB - Tool-specific memory warning

  /** Tool critical memory threshold */
  TOOL_CRITICAL_MB: 50, // 50MB - Tool critical memory usage

  /** Memory leak detection threshold */
  LEAK_DETECTION_MB: 300, // 300MB - Potential memory leak

  /** Maximum allowed memory before forced cleanup */
  MAX_ALLOWED_MB: 500, // 500MB - Force cleanup threshold

  /** Heap growth rate warning (MB per minute) */
  GROWTH_RATE_WARNING_MB_PER_MIN: 10, // 10MB/min - Suspicious growth rate

  /** Moderate memory usage threshold */
  MODERATE_USAGE_MB: 30, // 30MB - Moderate memory usage

  /** Low memory usage threshold */
  LOW_USAGE_MB: 10, // 10MB - Low memory usage

  /** Moderate memory delta threshold for operations */
  OPERATION_MODERATE_MB: 30, // 30MB - Moderate operation memory usage

  /** Small memory delta threshold for operations */
  OPERATION_SMALL_MB: 10, // 10MB - Small operation memory usage

  /** Large memory delta threshold requiring GC */
  OPERATION_LARGE_MB: 50, // 50MB - Large operation memory usage
} as const;

/**
 * Response time threshold configuration
 * Defines what constitutes fast, acceptable, and slow response times
 */
export const RESPONSE_TIME_THRESHOLDS = {
  /** Fast response time - excellent performance */
  FAST_MS: 1000, // 1s - Fast response

  /** Acceptable response time - good performance */
  ACCEPTABLE_MS: 5000, // 5s - Acceptable response

  /** Slow response time - needs optimization */
  SLOW_MS: 10000, // 10s - Slow response warning

  /** Critical response time - unacceptable */
  CRITICAL_MS: 30000, // 30s - Critical response time

  /** Tool execution fast threshold */
  TOOL_FAST_MS: 2000, // 2s - Fast tool execution

  /** Tool execution slow threshold */
  TOOL_SLOW_MS: 15000, // 15s - Slow tool execution

  /** Provider response fast threshold */
  PROVIDER_FAST_MS: 3000, // 3s - Fast provider response

  /** Provider response slow threshold */
  PROVIDER_SLOW_MS: 20000, // 20s - Slow provider response
} as const;

/**
 * Concurrency limit configuration
 * Controls parallel execution to prevent resource exhaustion
 */
export const CONCURRENCY_LIMITS = {
  /** Default concurrent operations */
  DEFAULT: 5, // 5 - Default concurrent operations

  /** High-load scenario concurrency */
  HIGH_LOAD: 10, // 10 - High-load scenarios

  /** Low-resource environment concurrency */
  LOW_RESOURCE: 2, // 2 - Low-resource environments

  /** Provider-specific concurrency */
  PROVIDER: 3, // 3 - Provider-specific limits

  /** Tool execution concurrency */
  TOOL_EXECUTION: 4, // 4 - Tool execution concurrency

  /** MCP server concurrency */
  MCP_SERVER: 8, // 8 - MCP server operations

  /** Network request concurrency */
  NETWORK_REQUEST: 6, // 6 - Network requests

  /** Maximum concurrent streams */
  MAX_STREAMS: 3, // 3 - Maximum concurrent streams

  /** Database operation concurrency */
  DATABASE: 5, // 5 - Database operations
} as const;

/**
 * Buffer size configuration
 * Optimized buffer sizes for different types of operations
 */
export const BUFFER_SIZES = {
  /** Small buffer for lightweight operations */
  SMALL_BYTES: 1024, // 1KB - Small buffer operations

  /** Standard buffer for most operations */
  STANDARD_BYTES: 4096, // 4KB - Standard buffer size

  /** Large buffer for heavy operations */
  LARGE_BYTES: 8192, // 8KB - Large buffer operations

  /** Extra large buffer for file operations */
  XLARGE_BYTES: 16384, // 16KB - Extra large buffer

  /** Memory buffer for streaming */
  STREAM_BYTES: 2048, // 2KB - Streaming buffer

  /** Network buffer size */
  NETWORK_BYTES: 4096, // 4KB - Network operations

  /** File I/O buffer size */
  FILE_IO_BYTES: 8192, // 8KB - File operations

  /** Maximum single buffer size */
  MAX_BYTES: 32768, // 32KB - Maximum buffer size
} as const;

/**
 * Cache configuration
 * Size limits and policies for various cache types
 */
export const CACHE_CONFIG = {
  /** Small cache for frequently accessed items */
  SMALL_SIZE: 100, // 100 entries - Small cache

  /** Default cache size for most use cases */
  DEFAULT_SIZE: 1000, // 1000 entries - Default cache

  /** Large cache for extensive data */
  LARGE_SIZE: 10000, // 10000 entries - Large cache

  /** Provider cache size */
  PROVIDER_CACHE_SIZE: 500, // 500 entries - Provider cache

  /** Tool registry cache size */
  TOOL_REGISTRY_SIZE: 200, // 200 entries - Tool cache

  /** Model configuration cache */
  MODEL_CONFIG_SIZE: 50, // 50 entries - Model cache

  /** Session cache size */
  SESSION_CACHE_SIZE: 1000, // 1000 entries - Session cache

  /** Maximum cache size */
  MAX_SIZE: 50000, // 50000 entries - Maximum cache size

  /** Cache TTL in milliseconds */
  DEFAULT_TTL_MS: 300000, // 5 minutes - Default cache TTL

  /** Short TTL for volatile data */
  SHORT_TTL_MS: 60000, // 1 minute - Short TTL

  /** Long TTL for stable data */
  LONG_TTL_MS: 3600000, // 1 hour - Long TTL
} as const;

/**
 * Resource monitoring configuration
 * Intervals and thresholds for monitoring system resources
 */
export const MONITORING_CONFIG = {
  /** Default monitoring interval */
  DEFAULT_INTERVAL_MS: 30000, // 30s - Default monitoring interval

  /** High-frequency monitoring interval */
  HIGH_FREQ_INTERVAL_MS: 5000, // 5s - High-frequency monitoring

  /** Low-frequency monitoring interval */
  LOW_FREQ_INTERVAL_MS: 60000, // 1m - Low-frequency monitoring

  /** Memory check interval */
  MEMORY_CHECK_INTERVAL_MS: 15000, // 15s - Memory monitoring

  /** Performance metrics collection interval */
  METRICS_INTERVAL_MS: 10000, // 10s - Metrics collection

  /** Health check interval */
  HEALTH_CHECK_INTERVAL_MS: 30000, // 30s - Health checks

  /** CPU usage check interval */
  CPU_CHECK_INTERVAL_MS: 20000, // 20s - CPU monitoring

  /** Disk usage check interval */
  DISK_CHECK_INTERVAL_MS: 120000, // 2m - Disk monitoring
} as const;

/**
 * Performance optimization thresholds
 * Values that trigger performance optimization actions
 */
export const OPTIMIZATION_THRESHOLDS = {
  /** CPU usage threshold for optimization */
  CPU_USAGE_PERCENT: 80, // 80% - CPU optimization threshold

  /** Memory usage threshold for cleanup */
  MEMORY_CLEANUP_PERCENT: 85, // 85% - Memory cleanup threshold

  /** Disk usage threshold for cleanup */
  DISK_CLEANUP_PERCENT: 90, // 90% - Disk cleanup threshold

  /** Connection pool optimization threshold */
  CONNECTION_POOL_PERCENT: 75, // 75% - Connection pool optimization

  /** Cache hit rate minimum threshold */
  CACHE_HIT_RATE_MIN_PERCENT: 60, // 60% - Minimum cache hit rate

  /** Queue length threshold for scaling */
  QUEUE_LENGTH_THRESHOLD: 50, // 50 items - Queue scaling threshold

  /** Error rate threshold for intervention */
  ERROR_RATE_THRESHOLD_PERCENT: 5, // 5% - Error rate threshold
} as const;

/**
 * Garbage collection configuration
 * Settings for automatic resource cleanup
 */
export const GC_CONFIG = {
  /** Memory threshold for forced GC */
  FORCE_GC_THRESHOLD_MB: 400, // 400MB - Force garbage collection

  /** Interval for automatic GC checks */
  AUTO_GC_INTERVAL_MS: 120000, // 2m - Auto GC check interval

  /** Memory growth rate for GC trigger */
  GC_TRIGGER_GROWTH_MB: 50, // 50MB - GC trigger growth

  /** Cache cleanup interval */
  CACHE_CLEANUP_INTERVAL_MS: 300000, // 5m - Cache cleanup interval

  /** Temporary file cleanup interval */
  TEMP_FILE_CLEANUP_MS: 600000, // 10m - Temp file cleanup

  /** Log rotation threshold */
  LOG_ROTATION_SIZE_MB: 100, // 100MB - Log rotation size
} as const;

/**
 * Server configuration constants
 * Default configurations for various server types
 */
export const SERVER_CONFIG = {
  /** Maximum number of MCP servers */
  MAX_MCP_SERVERS: 20, // 20 - Maximum MCP servers

  /** Default Ollama port */
  DEFAULT_OLLAMA_PORT: 11434, // 11434 - Ollama service port

  /** Maximum number of event handlers */
  MAX_EVENT_HANDLERS: 5, // 5 - Maximum event handlers

  /** Default server startup timeout */
  STARTUP_TIMEOUT_MS: 15000, // 15s - Server startup timeout

  /** Provider test timeout */
  PROVIDER_TEST_TIMEOUT_MS: 5000, // 5s - Provider connectivity test

  /** MCP connection test timeout */
  MCP_CONNECTION_TEST_TIMEOUT_MS: 10000, // 10s - MCP connection test

  /** External tool execution timeout */
  EXTERNAL_TOOL_TIMEOUT_MS: 30000, // 30s - External tool execution
} as const;

/**
 * Performance utility functions
 */
export const PerformanceUtils = {
  /**
   * Get appropriate concurrency limit based on available resources
   * @param resourceLevel - Resource availability level (low, medium, high)
   * @returns Recommended concurrency limit
   */
  getConcurrencyLimit: (
    resourceLevel: "low" | "medium" | "high" = "medium",
  ): number => {
    switch (resourceLevel) {
      case "low":
        return CONCURRENCY_LIMITS.LOW_RESOURCE;
      case "high":
        return CONCURRENCY_LIMITS.HIGH_LOAD;
      default:
        return CONCURRENCY_LIMITS.DEFAULT;
    }
  },

  /**
   * Get appropriate buffer size for operation type
   * @param operationType - Type of operation (network, file, stream, etc.)
   * @returns Recommended buffer size in bytes
   */
  getBufferSize: (
    operationType: "network" | "file" | "stream" | "standard" = "standard",
  ): number => {
    switch (operationType) {
      case "network":
        return BUFFER_SIZES.NETWORK_BYTES;
      case "file":
        return BUFFER_SIZES.FILE_IO_BYTES;
      case "stream":
        return BUFFER_SIZES.STREAM_BYTES;
      default:
        return BUFFER_SIZES.STANDARD_BYTES;
    }
  },

  /**
   * Get cache configuration for specific use case
   * @param useCase - Cache use case (provider, tool, model, session)
   * @returns Cache configuration object
   */
  getCacheConfig: (
    useCase: "provider" | "tool" | "model" | "session" | "default" = "default",
  ) => {
    const baseConfig = {
      ttl: CACHE_CONFIG.DEFAULT_TTL_MS,
      maxSize: CACHE_CONFIG.DEFAULT_SIZE,
    };

    switch (useCase) {
      case "provider":
        return { ...baseConfig, maxSize: CACHE_CONFIG.PROVIDER_CACHE_SIZE };
      case "tool":
        return { ...baseConfig, maxSize: CACHE_CONFIG.TOOL_REGISTRY_SIZE };
      case "model":
        return {
          ...baseConfig,
          maxSize: CACHE_CONFIG.MODEL_CONFIG_SIZE,
          ttl: CACHE_CONFIG.LONG_TTL_MS,
        };
      case "session":
        return {
          ...baseConfig,
          maxSize: CACHE_CONFIG.SESSION_CACHE_SIZE,
          ttl: CACHE_CONFIG.SHORT_TTL_MS,
        };
      default:
        return baseConfig;
    }
  },

  /**
   * Check if memory usage exceeds threshold
   * @param currentUsageMB - Current memory usage in MB
   * @param threshold - Threshold type to check against
   * @returns True if threshold is exceeded
   */
  isMemoryThresholdExceeded: (
    currentUsageMB: number,
    threshold: "warning" | "critical" | "tool" | "leak" = "warning",
  ): boolean => {
    switch (threshold) {
      case "critical":
        return currentUsageMB > MEMORY_THRESHOLDS.CRITICAL_MB;
      case "tool":
        return currentUsageMB > MEMORY_THRESHOLDS.TOOL_WARNING_MB;
      case "leak":
        return currentUsageMB > MEMORY_THRESHOLDS.LEAK_DETECTION_MB;
      default:
        return currentUsageMB > MEMORY_THRESHOLDS.WARNING_MB;
    }
  },

  /**
   * Categorize response time performance
   * @param responseTimeMs - Response time in milliseconds
   * @returns Performance category
   */
  categorizeResponseTime: (
    responseTimeMs: number,
  ): "fast" | "acceptable" | "slow" | "critical" => {
    if (responseTimeMs <= RESPONSE_TIME_THRESHOLDS.FAST_MS) {
      return "fast";
    }
    if (responseTimeMs <= RESPONSE_TIME_THRESHOLDS.ACCEPTABLE_MS) {
      return "acceptable";
    }
    if (responseTimeMs <= RESPONSE_TIME_THRESHOLDS.SLOW_MS) {
      return "slow";
    }
    return "critical";
  },
} as const;

// Legacy compatibility exports
export const HIGH_MEMORY_THRESHOLD = MEMORY_THRESHOLDS.WARNING_MB;
export const DEFAULT_CONCURRENCY_LIMIT = CONCURRENCY_LIMITS.DEFAULT;
export const MAX_CONCURRENCY_LIMIT = CONCURRENCY_LIMITS.HIGH_LOAD;
export const SMALL_BUFFER_SIZE = BUFFER_SIZES.SMALL_BYTES;
export const LARGE_BUFFER_SIZE = BUFFER_SIZES.LARGE_BYTES;
export const DEFAULT_CACHE_SIZE = CACHE_CONFIG.DEFAULT_SIZE;

// New convenience exports for easy access
export const NANOSECOND_TO_MS_DIVISOR =
  UNIT_CONVERSIONS.NANOSECOND_TO_MS_DIVISOR;
export const TEXT_PREVIEW_LENGTHS_EXPORT = TEXT_PREVIEW_LENGTHS;
export const PERFORMANCE_THRESHOLDS_EXPORT = PERFORMANCE_THRESHOLDS;
