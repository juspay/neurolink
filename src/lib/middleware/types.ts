import type { LanguageModelV1Middleware } from "ai";
import type { JsonValue } from "../types/common.js";

/**
 * Metadata interface for NeuroLink middleware
 * Provides additional information about middleware without affecting execution
 */
export interface NeuroLinkMiddlewareMetadata {
  /** Unique identifier for the middleware */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the middleware does */
  description?: string;
  /** Priority for ordering (higher = earlier in chain) */
  priority?: number;
  /** Whether this middleware is enabled by default */
  defaultEnabled?: boolean;
  /** Configuration schema for the middleware */
  configSchema?: Record<string, unknown>;
}

/**
 * NeuroLink middleware with metadata
 * Combines standard AI SDK middleware with NeuroLink-specific metadata
 */
export interface NeuroLinkMiddleware extends LanguageModelV1Middleware {
  /** Middleware metadata */
  readonly metadata: NeuroLinkMiddlewareMetadata;
}

/**
 * Middleware configuration options
 */
export interface MiddlewareConfig {
  /** Whether the middleware is enabled */
  enabled?: boolean;
  /** Middleware-specific configuration */
  config?: Record<string, JsonValue>;
  /** Conditions under which to apply this middleware */
  conditions?: MiddlewareConditions;
}

/**
 * Conditions for applying middleware
 */
export interface MiddlewareConditions {
  /** Apply only to specific providers */
  providers?: string[];
  /** Apply only to specific models */
  models?: string[];
  /** Apply only when certain options are present */
  options?: Record<string, unknown>;
  /** Custom condition function */
  custom?: (context: MiddlewareContext) => boolean;
}

/**
 * Context passed to middleware for decision making
 */
export interface MiddlewareContext {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Request options */
  options: Record<string, unknown>;
  /** Session information */
  session?: {
    sessionId?: string;
    userId?: string;
  };
  /** Additional metadata */
  metadata?: Record<string, JsonValue>;
}

/**
 * Middleware registration options
 */
export interface MiddlewareRegistrationOptions {
  /** Whether to replace existing middleware with same ID */
  replace?: boolean;
  /** Whether to enable the middleware by default */
  defaultEnabled?: boolean;
  /** Global configuration for the middleware */
  globalConfig?: Record<string, JsonValue>;
}

/**
 * Middleware execution result
 */
export interface MiddlewareExecutionResult {
  /** Whether the middleware was applied */
  applied: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Any errors that occurred */
  error?: Error;
  /** Additional metadata from the middleware */
  metadata?: Record<string, JsonValue>;
}

/**
 * Middleware chain execution statistics
 */
export interface MiddlewareChainStats {
  /** Total number of middleware in the chain */
  totalMiddleware: number;
  /** Number of middleware that were applied */
  appliedMiddleware: number;
  /** Total execution time for the chain */
  totalExecutionTime: number;
  /** Individual middleware execution results */
  results: Record<string, MiddlewareExecutionResult>;
}

/**
 * Built-in middleware types
 */
export type BuiltInMiddlewareType =
  | "analytics"
  | "guardrails"
  | "logging"
  | "caching"
  | "rateLimit"
  | "retry"
  | "timeout";

/**
 * Middleware preset configurations
 */
export interface MiddlewarePreset {
  /** Preset name */
  name: string;
  /** Description of the preset */
  description: string;
  /** Middleware configurations in the preset */
  middleware: Record<string, MiddlewareConfig>;
}

/**
 * Factory options for middleware
 */
export interface MiddlewareFactoryOptions {
  /** Enable specific middleware */
  enabledMiddleware?: string[];
  /** Disable specific middleware */
  disabledMiddleware?: string[];
  /** Middleware configurations */
  middlewareConfig?: Record<string, MiddlewareConfig>;
  /** Use a preset configuration */
  preset?: string;
  /** Global middleware settings */
  global?: {
    /** Maximum execution time for middleware chain */
    maxExecutionTime?: number;
    /** Whether to continue on middleware errors */
    continueOnError?: boolean;
    /** Whether to collect execution statistics */
    collectStats?: boolean;
  };
}
