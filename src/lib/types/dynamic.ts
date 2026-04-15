/**
 * Dynamic Arguments Type Definitions
 *
 * Pass functions instead of static values to generate() and stream().
 * Functions are resolved at runtime before provider dispatch.
 *
 * @module types/dynamic
 */

import type { AIProviderName } from "../constants/enums.js";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Context passed to context-aware dynamic argument functions.
 * `requestContext` is whatever the consumer passed as `dynamicContext` —
 * NeuroLink does not prescribe its shape.
 */
export type DynamicResolutionContext = {
  /** Consumer-provided context (any shape) */
  requestContext: Record<string, unknown>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
};

/**
 * A value that can be static, a function, or a context-aware function.
 *
 * @example
 * ```typescript
 * // Static
 * model: "gpt-4o"
 *
 * // Function
 * model: () => process.env.MODEL || "gpt-4o"
 *
 * // Context-aware
 * model: (ctx) => ctx.requestContext.plan === "enterprise" ? "gpt-4o" : "gpt-4o-mini"
 * ```
 */
export type DynamicArgument<T> =
  | T
  | (() => T)
  | (() => Promise<T>)
  | ((context: DynamicResolutionContext) => T)
  | ((context: DynamicResolutionContext) => Promise<T>);

// ============================================================================
// Generate / Stream Options
// ============================================================================

/**
 * Dynamic options for generate() and stream() — pass functions
 * instead of static values for context-aware resolution.
 */
export type DynamicOptions = {
  model?: DynamicArgument<string>;
  provider?: DynamicArgument<AIProviderName | string>;
  temperature?: DynamicArgument<number>;
  maxTokens?: DynamicArgument<number>;
  systemPrompt?: DynamicArgument<string>;
  /**
   * Resolves to a `string[]` of tool names to enable.
   * The resolved array is merged into `enabledToolNames` (and from there
   * into `toolFilter`) — it does NOT replace `GenerateOptions.tools`,
   * which is a `Record<string, Tool>` map of tool definitions.
   */
  tools?: DynamicArgument<string[]>;
  timeout?: DynamicArgument<number>;
  thinkingLevel?: DynamicArgument<"minimal" | "low" | "medium" | "high">;
  disableTools?: DynamicArgument<boolean>;
  enableAnalytics?: DynamicArgument<boolean>;
  enableEvaluation?: DynamicArgument<boolean>;
  input: {
    text: string;
    images?: Array<Buffer | string>;
    files?: Array<Buffer | string>;
  };
  /**
   * Context passed to dynamic resolver functions — any shape you want.
   *
   * This is intentionally separate from `GenerateOptions.context` (which is
   * for telemetry/tracing metadata). If your resolvers need values from
   * telemetry context (sessionId, userId, etc.), pass them here as well.
   */
  dynamicContext?: Record<string, unknown>;
};

// ============================================================================
// Internal Resolution Types (used by dynamic resolver)
// ============================================================================

export type ResolutionOptions = {
  timeout?: number;
  cache?: boolean;
  cacheKey?: string;
  cacheTtl?: number;
  defaultValue?: unknown;
  throwOnError?: boolean;
};

export type ResolutionResult<T> = {
  value: T;
  fromCache: boolean;
  resolutionTime: number;
  resolutionType:
    | "static"
    | "sync-function"
    | "async-function"
    | "context-aware";
};

export type DynamicConfig<T> = {
  [K in keyof T]: DynamicArgument<T[K]>;
};

export type ResolvedConfig<T> = {
  [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K];
};

// ============================================================================
// Internal Cache Type (used by dynamic resolver)
// ============================================================================

export type DynamicCacheEntry<T> = {
  value: T;
  resolvedAt: number;
  expiresAt: number;
  key: string;
};
