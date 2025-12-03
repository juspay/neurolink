import type { LanguageModelV1Middleware } from "ai";
import type { JsonValue } from "../types/common.js";
import type { EvaluationData } from "./evaluation.js";
import type { GetPromptFunction } from "./evaluationTypes.js";

/**
 * Metadata type for NeuroLink middleware
 * Provides additional information about middleware without affecting execution
 */
export type NeuroLinkMiddlewareMetadata = {
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
};

/**
 * NeuroLink middleware with metadata
 * Combines standard AI SDK middleware with NeuroLink-specific metadata
 */
export type NeuroLinkMiddleware = LanguageModelV1Middleware & {
  /** Middleware metadata */
  readonly metadata: NeuroLinkMiddlewareMetadata;
};

/**
 * Middleware configuration options
 */
export type MiddlewareConfig = {
  /** Whether the middleware is enabled */
  enabled?: boolean;
  /** Middleware-specific configuration */
  config?: Record<string, unknown>;
  /** Conditions under which to apply this middleware */
  conditions?: MiddlewareConditions;
};

/**
 * Conditions for applying middleware
 */
export type MiddlewareConditions = {
  /** Apply only to specific providers */
  providers?: string[];
  /** Apply only to specific models */
  models?: string[];
  /** Apply only when certain options are present */
  options?: Record<string, unknown>;
  /** Custom condition function */
  custom?: (context: MiddlewareContext) => boolean;
};

/**
 * Context passed to middleware for decision making
 */
export type MiddlewareContext = {
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
};

/**
 * Middleware registration options
 */
export type MiddlewareRegistrationOptions = {
  /** Whether to replace existing middleware with same ID */
  replace?: boolean;
  /** Whether to enable the middleware by default */
  defaultEnabled?: boolean;
  /** Global configuration for the middleware */
  globalConfig?: Record<string, JsonValue>;
};

/**
 * Middleware execution result
 */
export type MiddlewareExecutionResult = {
  /** Whether the middleware was applied */
  applied: boolean;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Any errors that occurred */
  error?: Error;
  /** Additional metadata from the middleware */
  metadata?: Record<string, JsonValue>;
};

/**
 * Middleware chain execution statistics
 */
export type MiddlewareChainStats = {
  /** Total number of middleware in the chain */
  totalMiddleware: number;
  /** Number of middleware that were applied */
  appliedMiddleware: number;
  /** Total execution time for the chain */
  totalExecutionTime: number;
  /** Individual middleware execution results */
  results: Record<string, MiddlewareExecutionResult>;
};

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
  | "timeout"
  | "autoEvaluation";

/**
 * Middleware preset configurations
 */
export type MiddlewarePreset = {
  /** Preset name */
  name: string;
  /** Description of the preset */
  description: string;
  /** Middleware configurations in the preset */
  config: Record<string, MiddlewareConfig>;
};

/**
 * Factory options for middleware
 */
export type MiddlewareFactoryOptions = {
  /** Custom middleware to register on initialization */
  middleware?: NeuroLinkMiddleware[];
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
};

/**
 * Configuration for the Auto-Evaluation Middleware.
 */
export type AutoEvaluationConfig = {
  /** The minimum score (1-10) for a response to be considered passing. */
  threshold?: number;
  /** The maximum number of retry attempts before failing. */
  maxRetries?: number;
  /** The model to use for the LLM-as-judge evaluation. */
  evaluationModel?: string;
  /**
   * If true, the middleware will wait for the evaluation to complete before returning.
   * If the evaluation fails, it will throw an error. Defaults to true.
   */
  blocking?: boolean;
  /** A callback function to be invoked with the evaluation result. */
  onEvaluationComplete?: (evaluation: EvaluationData) => void | Promise<void>;
  /** The score below which a response is considered off-topic. */
  offTopicThreshold?: number;
  /** The score below which a failing response is considered a high severity alert. */
  highSeverityThreshold?: number;

  promptGenerator?: GetPromptFunction;

  provider?: string;
};

/**
 * Middleware factory configuration options
 */
export type MiddlewareFactoryConfig = {
  enabled: boolean;
  type: string;
  priority?: number;
  config?: Record<string, unknown>;
};

/**
 * Middleware registry entry
 */
export type MiddlewareRegistryEntry = {
  name: string;
  factory: MiddlewareFactory;
  defaultConfig: Record<string, unknown>;
  description?: string;
  version?: string;
};

/**
 * Middleware factory function type
 */
export type MiddlewareFactory = (
  config: Record<string, unknown>,
) => LanguageModelV1Middleware;

/**
 * Middleware validation result
 */
export type MiddlewareValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Middleware execution context
 */
export type MiddlewareExecutionContext = {
  requestId: string;
  timestamp: number;
  provider: string;
  model: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Middleware performance metrics
 */
export type MiddlewareMetrics = {
  name: string;
  executionTime: number;
  status: "success" | "error" | "skipped";
  error?: string;
  inputSize: number;
  outputSize: number;
};

/**
 * Middleware chain configuration
 */
export type MiddlewareChainConfig = {
  middlewares: MiddlewareFactoryConfig[];
  errorHandling: "continue" | "stop" | "rollback";
  timeout?: number;
  retries?: number;
};
