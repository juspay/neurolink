/**
 * MCP Contract - Core Type Definitions
 * Industry standard camelCase interfaces for maximum flexibility
 */

import type { StandardRecord } from "../../types/typeAliases.js";

/**
 * Generic execution context for MCP operations
 * All properties optional for maximum flexibility
 */
export interface ExecutionContext<T = StandardRecord> {
  // Core identifiers (optional)
  sessionId?: string; // Session/request identifier
  userId?: string; // User identifier

  // Generic extensibility (industry standard)
  config?: T; // Generic configuration payload
  metadata?: StandardRecord; // Flexible metadata

  // Performance & resilience (standard patterns)
  cacheOptions?: CacheOptions;
  fallbackOptions?: FallbackOptions;
  timeoutMs?: number;
  startTime?: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  enabled?: boolean;
  ttlMs?: number; // Time to live (milliseconds)
  strategy?: "memory" | "writeThrough" | "cacheAside";
}

/**
 * Fallback configuration options
 */
export interface FallbackOptions {
  enabled?: boolean;
  maxAttempts?: number;
  delayMs?: number;
  circuitBreaker?: boolean;
}

/**
 * Tool information with extensibility
 */
export interface ToolInfo {
  name: string;
  description?: string;
  category?: string;
  serverId?: string;
  inputSchema?: StandardRecord;
  outputSchema?: StandardRecord;
  [key: string]: unknown; // Generic extensibility
}

/**
 * Discovered MCP server/plugin definition
 */
export interface DiscoveredMcp<TTools = StandardRecord> {
  metadata: McpMetadata;
  tools?: TTools;
  capabilities?: string[];
  version?: string;
  configuration?: Record<string, string | number | boolean>;
  [key: string]: unknown; // Generic extensibility
}

/**
 * MCP server metadata
 */
export interface McpMetadata {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  category?: string; // Server category (e.g., "ai-tools", "database", "api")
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult<T = unknown> {
  result: T;
  context?: ExecutionContext; // Updated context after execution
  performance?: {
    duration: number;
    tokensUsed?: number;
    cost?: number;
  };
  validation?: ValidationResult; // Runtime validation results
  cached?: boolean; // Whether result came from cache
  fallback?: boolean; // Whether result came from fallback
}

/**
 * Validation result for runtime checks
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  available: boolean;
  lastCheck: number;
  reason?: string;
  model?: string;
  cost?: number;
  latencyMs?: number;
}
