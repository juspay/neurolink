/**
 * Timeout Constants for NeuroLink
 *
 * Centralized timeout configuration to replace magic numbers throughout the codebase.
 * Each timeout value includes business justification and use case documentation.
 *
 * @fileoverview Timeout constants organized by functional area
 * @author NeuroLink Team
 * @version 1.0.0
 */

/**
 * Tool execution timeout constants
 * These values balance reliability vs performance for AI tool operations
 */
export const TOOL_TIMEOUTS = {
  /** Default timeout for AI tool execution - handles most complex operations */
  EXECUTION_DEFAULT_MS: 30000, // 30s - Complex AI tool operations requiring LLM calls

  /** Fast timeout for simple tools that should complete quickly */
  EXECUTION_FAST_MS: 5000, // 5s - Simple tool operations (calculations, lookups)

  /** Extended timeout for complex analysis operations */
  EXECUTION_COMPLEX_MS: 60000, // 60s - Complex analysis, multiple API calls

  /** Ultra-long timeout for batch operations */
  EXECUTION_BATCH_MS: 120000, // 2m - Batch processing, large data operations
} as const;

/**
 * Provider connectivity and health check timeouts
 * Tuned for quick health checks while allowing for network latency
 */
export const PROVIDER_TIMEOUTS = {
  /** Quick provider health check - should fail fast */
  TEST_MS: 5000, // 5s - Provider health check ping

  /** Provider connection establishment timeout */
  CONNECTION_MS: 10000, // 10s - Initial connection setup

  /** Authentication validation timeout */
  AUTH_MS: 3000, // 3s - API key validation

  /** Model availability check timeout */
  MODEL_CHECK_MS: 8000, // 8s - Model existence/availability check

  /** Provider capability discovery timeout */
  CAPABILITY_DISCOVERY_MS: 15000, // 15s - Feature discovery and validation
} as const;

/**
 * MCP (Model Context Protocol) system timeouts
 * Balanced for reliable MCP server communication
 */
export const MCP_TIMEOUTS = {
  /** MCP server initialization timeout */
  INITIALIZATION_MS: 3000, // 3s - MCP server startup

  /** Tool discovery timeout per server */
  TOOL_DISCOVERY_MS: 10000, // 10s - Tool enumeration from MCP server

  /** MCP client connection timeout */
  CLIENT_CONNECTION_MS: 5000, // 5s - Client connection establishment

  /** External MCP server startup timeout */
  EXTERNAL_SERVER_STARTUP_MS: 15000, // 15s - External process startup

  /** MCP server shutdown timeout */
  SHUTDOWN_MS: 5000, // 5s - Graceful server shutdown
} as const;

/**
 * Circuit breaker timeout configuration
 * Prevents cascading failures while allowing recovery
 */
export const CIRCUIT_BREAKER_TIMEOUTS = {
  /** Circuit breaker reset timeout - how long to wait before retry */
  RESET_MS: 60000, // 60s - Circuit breaker reset time

  /** Half-open state timeout - trial period for recovery */
  HALF_OPEN_MS: 30000, // 30s - Half-open state timeout

  /** Monitoring window for failure rate calculation */
  MONITORING_WINDOW_MS: 300000, // 5m - Sliding window for failure tracking
} as const;

/**
 * Network operation timeouts
 * Configured for various network conditions and use cases
 */
export const NETWORK_TIMEOUTS = {
  /** Standard network request timeout */
  REQUEST_MS: 15000, // 15s - Standard HTTP requests

  /** Quick connectivity check timeout */
  QUICK_CHECK_MS: 2000, // 2s - Fast network availability check

  /** File download/upload timeout per MB */
  TRANSFER_PER_MB_MS: 1000, // 1s per MB - File transfer operations

  /** DNS resolution timeout */
  DNS_RESOLUTION_MS: 3000, // 3s - DNS lookup timeout

  /** WebSocket connection timeout */
  WEBSOCKET_CONNECTION_MS: 10000, // 10s - WebSocket handshake
} as const;

/**
 * System operation timeouts
 * For application lifecycle and resource management
 */
export const SYSTEM_TIMEOUTS = {
  /** Application graceful shutdown timeout */
  GRACEFUL_SHUTDOWN_MS: 30000, // 30s - Complete application shutdown

  /** Resource cleanup timeout */
  CLEANUP_OPERATION_MS: 5000, // 5s - Memory/resource cleanup

  /** Cache flush timeout */
  CACHE_FLUSH_MS: 3000, // 3s - Cache clearing operations

  /** Health check interval */
  HEALTH_CHECK_INTERVAL_MS: 30000, // 30s - Periodic health monitoring

  /** Metrics collection timeout */
  METRICS_COLLECTION_MS: 1000, // 1s - Performance metrics gathering
} as const;

/**
 * Development and testing timeouts
 * Separate timeouts for development vs production environments
 */
export const DEV_TIMEOUTS = {
  /** Extended timeout for debugging */
  DEBUG_EXTENDED_MS: 300000, // 5m - Long timeout for debugging sessions

  /** Unit test timeout */
  UNIT_TEST_MS: 10000, // 10s - Individual test timeout

  /** Integration test timeout */
  INTEGRATION_TEST_MS: 60000, // 60s - Full integration test

  /** Mock service response delay */
  MOCK_DELAY_MS: 100, // 100ms - Simulated service delay
} as const;

/**
 * Combined timeout constants for easy access
 * Exports all timeout categories in a single object
 */
export const TIMEOUTS = {
  TOOL: TOOL_TIMEOUTS,
  PROVIDER: PROVIDER_TIMEOUTS,
  MCP: MCP_TIMEOUTS,
  CIRCUIT_BREAKER: CIRCUIT_BREAKER_TIMEOUTS,
  NETWORK: NETWORK_TIMEOUTS,
  SYSTEM: SYSTEM_TIMEOUTS,
  DEV: DEV_TIMEOUTS,
} as const;

/**
 * Timeout utility functions
 */
export const TimeoutUtils = {
  /**
   * Get environment-adjusted timeout
   * @param baseTimeout - Base timeout value in milliseconds
   * @param environment - Target environment (development gets 2x timeout)
   * @returns Adjusted timeout value
   */
  getEnvironmentTimeout: (
    baseTimeout: number,
    environment = process.env.NODE_ENV,
  ): number => {
    return environment === "development" ? baseTimeout * 2 : baseTimeout;
  },

  /**
   * Get timeout with jitter to prevent thundering herd
   * @param baseTimeout - Base timeout value
   * @param jitterFactor - Jitter factor (0.1 = 10% random variation)
   * @returns Timeout with random jitter applied
   */
  getTimeoutWithJitter: (baseTimeout: number, jitterFactor = 0.1): number => {
    const jitter = Math.random() * baseTimeout * jitterFactor;
    return Math.floor(baseTimeout + jitter);
  },

  /**
   * Parse timeout string to milliseconds
   * @param timeout - Timeout string like "30s", "2m", "1h" or number
   * @returns Timeout in milliseconds
   */
  parseTimeout: (timeout: string | number): number => {
    if (typeof timeout === "number") {
      return timeout;
    }

    const match = timeout.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
    if (!match) {
      throw new Error(`Invalid timeout format: ${timeout}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] || "s";

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      default:
        return value;
    }
  },
} as const;

// Legacy compatibility - maintain backward compatibility
export const DEFAULT_TIMEOUT = TOOL_TIMEOUTS.EXECUTION_DEFAULT_MS;
export const PROVIDER_TEST_TIMEOUT = PROVIDER_TIMEOUTS.TEST_MS;
export const MCP_INIT_TIMEOUT = MCP_TIMEOUTS.INITIALIZATION_MS;
export const CIRCUIT_BREAKER_RESET_MS = CIRCUIT_BREAKER_TIMEOUTS.RESET_MS;
