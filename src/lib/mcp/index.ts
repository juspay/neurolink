/**
 * MCP Ecosystem - Main Export
 * Universal AI Development Platform with Extensible Plugin Architecture
 * Implementation based on research blueprint
 */
import type { McpMetadata } from "../types/mcpTypes.js";

export { mcpLogger } from "../utils/logger.js";

// HTTP Transport types - exported from centralized types
export type {
  RateLimitConfig,
  HTTPRetryConfig,
  OAuthTokens,
  TokenStorage,
  MCPOAuthConfig,
  OAuthClientInformation,
  AuthorizationUrlResult,
  TokenExchangeRequest,
} from "../types/mcpTypes.js";

// HTTP Rate Limiter
export {
  HTTPRateLimiter,
  RateLimiterManager,
  globalRateLimiterManager,
  DEFAULT_RATE_LIMIT_CONFIG,
} from "./httpRateLimiter.js";

// HTTP Retry Handler
export {
  DEFAULT_HTTP_RETRY_CONFIG,
  isRetryableStatusCode,
  isRetryableHTTPError,
  withHTTPRetry,
} from "./httpRetryHandler.js";

// OAuth Authentication
export {
  InMemoryTokenStorage,
  FileTokenStorage,
  isTokenExpired,
  calculateExpiresAt,
  NeuroLinkOAuthProvider,
  createOAuthProviderFromConfig,
} from "./auth/index.js";

// Circuit Breaker
export {
  MCPCircuitBreaker,
  CircuitBreakerManager,
  globalCircuitBreakerManager,
} from "./mcpCircuitBreaker.js";

/**
 * Initialize the MCP ecosystem - simplified
 */
export async function initializeMCPEcosystem(): Promise<void> {
  // Simplified initialization - no complex ecosystem needed
  return Promise.resolve();
}

/**
 * List available MCPs - simplified
 */
export async function listMCPs(): Promise<McpMetadata[]> {
  return [];
}

/**
 * Execute an MCP operation - simplified
 */
export async function executeMCP<T = unknown>(
  _name: string,
  _config: unknown,
  _args: unknown,
  _context?: {
    sessionId?: string;
    userId?: string;
  },
): Promise<T> {
  throw new Error("MCP execution not available - ecosystem removed");
}

/**
 * Get MCP ecosystem statistics - simplified
 */
export async function getMCPStats(): Promise<{
  initialized: boolean;
  pluginsDiscovered: number;
  pluginsBySource: Record<string, number>;
  availablePlugins: string[];
}> {
  return {
    initialized: false,
    pluginsDiscovered: 0,
    pluginsBySource: {},
    availablePlugins: [],
  };
}
