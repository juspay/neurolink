import type { JsonValue } from "../types/common.js";
import type { EvaluationData, GetPromptFunction } from "./evaluation.js";
import type {
  AuthenticatedUser,
  RouteDefinition,
  ServerContext,
} from "./server.js";

// Middleware contract + low-level V3 protocol shapes. Today these resolve
// through the upstream generation library; consumers should import via the
// package barrel.
//
// `LanguageModelMiddleware` is both re-exported (for consumers) and used as a
// constraint in `NeuroLinkMiddleware` below — aliasing the local binding keeps
// the two roles textually distinct.
import type { LanguageModelMiddleware as BaseLanguageModelMiddleware } from "ai";
export type { LanguageModelMiddleware } from "ai";
export type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Message,
  LanguageModelV3StreamPart,
  LanguageModelV3ToolCall,
  LanguageModelV3ToolChoice,
  LanguageModelV3Source,
  LanguageModelV3Middleware,
  JSONSchema7,
} from "@ai-sdk/provider";

import type { LanguageModelV3 } from "@ai-sdk/provider";
export type LanguageModelV3GenerateResult = Awaited<
  ReturnType<LanguageModelV3["doGenerate"]>
>;
export type LanguageModelV3StreamResult = Awaited<
  ReturnType<LanguageModelV3["doStream"]>
>;

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
export type NeuroLinkMiddleware = BaseLanguageModelMiddleware & {
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
  | "autoEvaluation"
  | "lifecycle";

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
) => BaseLanguageModelMiddleware;

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

// ============================================
// LIFECYCLE MIDDLEWARE TYPES
// ============================================

/**
 * Payload delivered to onFinish callbacks after generation or streaming completes.
 */
export type LifecycleFinishPayload = {
  /** The generated text content */
  text: string;
  /** Token usage from the provider */
  usage?: { promptTokens: number; completionTokens: number };
  /** Wall-clock duration in milliseconds */
  duration: number;
  /** Why generation stopped */
  finishReason?: string;
};

/**
 * Payload delivered to onError callbacks when generation or streaming fails.
 */
export type LifecycleErrorPayload = {
  /** The error that occurred */
  error: Error;
  /** Wall-clock duration until failure in milliseconds */
  duration: number;
  /** Whether the error is likely recoverable (rate limit, timeout, network) */
  recoverable: boolean;
};

/**
 * Payload delivered to onChunk callbacks for each streaming chunk.
 */
export type LifecycleChunkPayload = {
  /** Chunk type from the AI SDK stream */
  type: string;
  /** Text content for text-delta chunks */
  textDelta?: string;
  /** Zero-based chunk sequence number */
  sequenceNumber: number;
};

/** Callback invoked when generation or streaming finishes successfully. */
export type OnFinishCallback = (
  payload: LifecycleFinishPayload,
) => void | Promise<void>;

/** Callback invoked when generation or streaming encounters an error. */
export type OnErrorCallback = (
  payload: LifecycleErrorPayload,
) => void | Promise<void>;

/** Callback invoked for each chunk during streaming. */
export type OnChunkCallback = (
  payload: LifecycleChunkPayload,
) => void | Promise<void>;

/**
 * Configuration for the lifecycle middleware.
 * Pass callbacks to observe generation/streaming lifecycle events.
 */
export type LifecycleMiddlewareConfig = {
  onFinish?: OnFinishCallback;
  onError?: OnErrorCallback;
  onChunk?: OnChunkCallback;
  /**
   * Per-callback deadline in milliseconds applied to every
   * `onChunk` / `onFinish` / `onError` invocation. When a callback
   * exceeds this it is logged and abandoned — generate()/stream()
   * still resolves or rejects on schedule.
   *
   * Defaults to the `NEUROLINK_LIFECYCLE_TIMEOUT_MS` env var (also
   * read by the CLI) and ultimately falls back to 5_000. Set `0`
   * to make consumer callbacks effectively fire-and-forget.
   */
  timeoutMs?: number;
};

/**
 * Structural view of the nested lifecycle config buried inside a request's
 * middleware blob. Extracted so call sites that need to read it (e.g.
 * `BaseProvider.wrapStreamWithLifecycleCallbacks`,
 * `BaseProvider.fireLifecycleErrorCallback`) don't each inline the same
 * three-level cast.
 */
export type OptionsWithLifecycleMiddleware = {
  middleware?: {
    middlewareConfig?: {
      lifecycle?: {
        config?: LifecycleMiddlewareConfig;
      };
    };
  };
};

// =============================================================================
// SERVER MIDDLEWARE (from server/middleware/*.ts)
// =============================================================================

/** Options for the abort-signal middleware. */
export type AbortSignalMiddlewareOptions = {
  onAbort?: (ctx: ServerContext) => void;
  timeout?: number;
};

/** Options for the bearer-token auth middleware. */
export type BearerAuthOptions = {
  required?: boolean;
  headerName?: string;
  skipPaths?: string[];
};

/** Token-validation function signature. */
export type TokenValidator = (
  token: string,
) => Promise<AuthenticatedUser | null> | AuthenticatedUser | null;

/** Options for the API-key auth middleware. */
export type ApiKeyAuthOptions = {
  headerName?: string;
  skipPaths?: string[];
};

/** Configuration for the route-deprecation middleware. */
export type DeprecationConfig = {
  routes: RouteDefinition[];
  noticeHeader?: string;
  includeLink?: boolean;
};

/** Rate-limit middleware configuration. */
export type RateLimitMiddlewareConfig = {
  maxRequests: number;
  windowMs: number;
  message?: string;
  skipPaths?: string[];
  keyGenerator?: (ctx: ServerContext) => string;
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;
  store?: RateLimitStore;
};

/** Rate-limit counter entry tracked per key. */
export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/** Rate-limit store contract (memory or Redis). */
export type RateLimitStore = {
  get(key: string): Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  reset(key: string): Promise<void>;
};

/** Simple fixed-window rate-limit configuration. */
export type FixedWindowRateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  message?: string;
  skipPaths?: string[];
  keyGenerator?: (ctx: ServerContext) => string;
  onRateLimitExceeded?: (ctx: ServerContext, retryAfter: number) => unknown;
};

/** Per-field entry inside a ServerValidationError's `errors` array. */
export type ValidationErrorPayload = {
  field: string;
  message: string;
  value?: unknown;
};

/**
 * Minimal structural view of the server-side ValidationError class used by
 * the request-validation middleware's errorFormatter callback.
 */
export type ValidationErrorInfo = {
  errors: ValidationErrorPayload[];
  requestId?: string;
};

/** Validation configuration for the request-validation middleware. */
export type ValidationConfig = {
  bodySchema?: MiddlewareRequestSchema;
  querySchema?: MiddlewareRequestSchema;
  paramsSchema?: MiddlewareRequestSchema;
  headersSchema?: MiddlewareRequestSchema;
  customValidator?: (ctx: ServerContext) => Promise<void>;
  skipPaths?: string[];
  errorFormatter?: (errors: ValidationErrorInfo[]) => unknown;
};

/**
 * Simple structural validation schema used by the request-validation
 * middleware. Named MiddlewareRequestSchema to disambiguate from the zod
 * `ValidationSchema` exported from aliases.ts (§Rule 9 domain prefix).
 */
export type MiddlewareRequestSchema = {
  required?: string[];
  properties?: Record<string, PropertySchema>;
  additionalProperties?: boolean;
};

/** Schema for an individual property in ValidationSchema. */
export type PropertySchema = {
  type: "string" | "number" | "boolean" | "object" | "array";
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  enum?: unknown[];
  default?: unknown;
  validate?: (value: unknown) => boolean | string;
};

/** PropertySchema with an extra `format` tag for common schemas. */
export type ExtendedPropertySchema = PropertySchema & {
  format?: string;
};

/** Extended validation schema for common schemas. */
export type ExtendedValidationSchema = {
  type?: string;
  format?: string;
  required?: string[];
  properties?: Record<string, ExtendedPropertySchema>;
  additionalProperties?: boolean;
};
