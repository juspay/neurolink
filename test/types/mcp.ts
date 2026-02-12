/**
 * MCP Test Types
 * Common type definitions used across MCP-related test files
 */

import type { IncomingHttpHeaders } from "http";
import type { Mock } from "vitest";
import type {
  MCPServerInfo,
  MCPToolInfo,
} from "../../src/lib/types/mcpTypes.js";

/**
 * Type for tracking captured HTTP requests in integration tests
 */
export type CapturedRequest = {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
  timestamp: number;
};

/**
 * Rate Limiter Configuration for token bucket algorithm
 */
export type RateLimiterConfig = {
  /** Maximum number of tokens in the bucket (burst capacity) */
  maxTokens: number;
  /** Number of tokens refilled per refill interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
  /** Initial number of tokens (defaults to maxTokens) */
  initialTokens?: number;
};

/**
 * HTTP Retry Configuration
 */
export type HTTPRetryConfig = {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay between retries in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff: boolean;
  /** Jitter factor for randomizing delays (0-1, default: 0.1) */
  jitterFactor: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: number[];
};

/**
 * Mock MCP Server Configuration for HTTP transport integration tests
 */
export type MockServerConfig = {
  /** Port number for the mock server */
  port: number;
  /** Optional delay in milliseconds before responding */
  responseDelay?: number;
  /** HTTP status code to return */
  statusCode?: number;
  /** Custom response body */
  customResponse?: Record<string, unknown>;
  /** Number of times to fail before succeeding */
  failCount?: number;
  /** Retry-After header value in seconds */
  retryAfterSeconds?: number;
};

/**
 * Type for accessing internal ExternalServerManager properties in tests.
 * This is needed because we're testing private implementation details.
 */
export type ExternalServerManagerInternal = {
  servers: Map<string, ServerInstance>;
  toolDiscovery: {
    discoverTools: Mock;
    executeTool: Mock;
  };
  discoverServerTools: (serverId: string) => Promise<void>;
};

/**
 * Server instance type for testing ExternalServerManager internals
 */
export type ServerInstance = MCPServerInfo & {
  process: null;
  client: {
    callTool: Mock;
    listTools?: Mock;
  };
  transportInstance: null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  toolsMap: Map<string, MCPToolInfo>;
  toolsArray?: MCPToolInfo[];
  metrics: {
    totalConnections: number;
    totalDisconnections: number;
    totalErrors: number;
    totalToolCalls: number;
    averageResponseTime: number;
    lastResponseTime: number;
  };
  config: MCPServerInfo;
};

/**
 * Rate limit response from server with standard rate limiting headers
 */
export type RateLimitResponse = {
  /** Retry-After header value in seconds */
  retryAfterSeconds?: number;
  /** X-RateLimit-Limit header */
  limit?: number;
  /** X-RateLimit-Remaining header */
  remaining?: number;
  /** X-RateLimit-Reset header (Unix timestamp) */
  resetTimestamp?: number;
};

/**
 * Parameters for purging quarterly data in dangerous operations tests
 */
export type PurgeQuarterlyDataParams = {
  /** Quarter identifier (e.g., "Q1", "Q2", "Q3", "Q4") */
  quarter: string;
};

/**
 * Parameters for terminating employees in dangerous operations tests
 */
export type TerminateEmployeesParams = {
  /** Department name to terminate employees from */
  department: string;
};

/**
 * Parameters for destroying inventory in dangerous operations tests
 */
export type DestroyInventoryParams = {
  /** Warehouse identifier */
  warehouseId: string;
};

/**
 * Color name type for console output formatting
 */
export type ColorName =
  | "reset"
  | "bright"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan";

// CommandResult has been replaced by ProcessResult in @juspay/neurolink types
