/**
 * Common utility types for NeuroLink
 */

import type {
  AutoresearchErrorEvent,
  AutoresearchExperimentCompletedEvent,
  AutoresearchExperimentStartedEvent,
  AutoresearchInitializedEvent,
  AutoresearchMetricImprovedEvent,
  AutoresearchPhaseChangedEvent,
  AutoresearchResumedEvent,
  AutoresearchRevertEvent,
  AutoresearchRevertFailedEvent,
  AutoresearchStateUpdatedEvent,
} from "./autoresearchTypes.js";

/**
 * Type-safe unknown value - use when type is truly unknown
 */
export type Unknown = unknown;

/**
 * Type-safe record for metadata and configuration objects
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Type-safe array of unknown items
 */
export type UnknownArray = unknown[];

/**
 * Storage type for conversation memory factory
 */
export type StorageType = "memory" | "redis";

/**
 * JSON-serializable value type
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export type JsonObject = {
  [key: string]: JsonValue;
};

export type JsonArray = JsonValue[];

/**
 * Type-safe error handling
 */
export type ErrorInfo = {
  message: string;
  code?: string | number;
  stack?: string;
  cause?: unknown;
};

/**
 * Generic success/error result type
 */
export type Result<T = unknown, E = ErrorInfo> = {
  success: boolean;
  data?: T;
  error?: E;
};

/**
 * Function parameter type for dynamic functions
 */
export type FunctionParameters = {
  [key: string]: unknown;
};

/**
 * Generic async function type
 */
export type AsyncFunction<TParams = FunctionParameters, TResult = unknown> = (
  params: TParams,
) => Promise<TResult>;

/**
 * Sync function type
 */
export type SyncFunction<TParams = FunctionParameters, TResult = unknown> = (
  params: TParams,
) => TResult;

/**
 * Union of async and sync functions
 */
export type AnyFunction<TParams = FunctionParameters, TResult = unknown> =
  | AsyncFunction<TParams, TResult>
  | SyncFunction<TParams, TResult>;

/**
 * Type guard to check if value is Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if value is ErrorInfo
 */
export function isErrorInfo(value: unknown): value is ErrorInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as ErrorInfo).message === "string"
  );
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isErrorInfo(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Safe error conversion
 */
export function toErrorInfo(error: unknown): ErrorInfo {
  if (isError(error)) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
    };
  }
  if (isErrorInfo(error)) {
    return error;
  }
  return {
    message: getErrorMessage(error),
  };
}

/**
 * Stream event types for real-time communication
 */
export type StreamEvent = {
  type: "stream:chunk" | "stream:complete" | "stream:error";
  content?: string;
  metadata?: JsonObject;
  timestamp: number;
};

/**
 * Enhanced NeuroLink event types
 * Flexible type to support both typed and legacy event patterns
 */
export type NeuroLinkEvents = {
  // Core tool events
  "tool:start": unknown;
  "tool:end": unknown;

  // Stream events
  "stream:start": unknown;
  "stream:end": unknown;
  "stream:chunk": unknown;
  "stream:complete": unknown;
  "stream:error": unknown;

  // Generation events
  "generation:start": unknown;
  "generation:end": unknown;

  // Response events
  "response:start": unknown;
  "response:end": unknown;

  // External MCP events
  "externalMCP:serverConnected": unknown;
  "externalMCP:serverDisconnected": unknown;
  "externalMCP:serverFailed": unknown;
  "externalMCP:toolDiscovered": unknown;
  "externalMCP:toolRemoved": unknown;
  "externalMCP:serverAdded": unknown;
  "externalMCP:serverRemoved": unknown;

  // Tool registration events
  "tools-register:start": unknown;
  "tools-register:end": unknown;

  // General events
  connected: unknown;
  message: unknown;
  error: unknown;
  log: unknown;

  // Log events
  "log-event": unknown;

  // Autoresearch lifecycle events
  "autoresearch:initialized": AutoresearchInitializedEvent;
  "autoresearch:resumed": AutoresearchResumedEvent;
  "autoresearch:phase-changed": AutoresearchPhaseChangedEvent;
  "autoresearch:experiment-started": AutoresearchExperimentStartedEvent;
  "autoresearch:experiment-completed": AutoresearchExperimentCompletedEvent;
  "autoresearch:metric-improved": AutoresearchMetricImprovedEvent;
  "autoresearch:revert": AutoresearchRevertEvent;
  "autoresearch:revert-failed": AutoresearchRevertFailedEvent;
  "autoresearch:state-updated": AutoresearchStateUpdatedEvent;
  "autoresearch:error": AutoresearchErrorEvent;

  // Allow any additional event for flexibility
  [key: string]: unknown;
};

/**
 * TypeScript utility for typed EventEmitter
 * Flexible interface to support both typed and legacy event patterns
 */
export type TypedEventEmitter<TEvents extends Record<string, unknown>> = {
  on<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  emit<K extends keyof TEvents>(event: K, ...args: unknown[]): boolean;
  off<K extends keyof TEvents>(
    event: K,
    listener: (...args: unknown[]) => void,
  ): TypedEventEmitter<TEvents>;
  removeAllListeners<K extends keyof TEvents>(
    event?: K,
  ): TypedEventEmitter<TEvents>;
  listenerCount<K extends keyof TEvents>(event: K): number;
  listeners<K extends keyof TEvents>(
    event: K,
  ): Array<(...args: unknown[]) => void>;
};

export type Context = {
  traceName?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, string | number | boolean>;
};

/**
 * Result of executing a child process (shell command).
 */
export type ProcessResult = {
  /** Exit code of the process */
  code: number | null;
  /** Standard output */
  stdout: string;
  /** Standard error output */
  stderr: string;
  /** Whether the process exited successfully (code === 0) */
  success: boolean;
};

/**
 * A named test function with an optional category.
 */
export type TestFunction = {
  /** Display name of the test */
  name: string;
  /** Async function that returns true on pass, false on fail */
  fn: () => Promise<boolean>;
  /** Optional grouping category */
  category?: string;
};

/**
 * Result of a single test execution.
 */
export type TestResult = {
  /** Display name of the test */
  name: string;
  /** Whether the test passed */
  result: boolean;
  /** Error message if the test failed, null otherwise */
  error: string | null;
  /** Optional grouping category */
  category?: string;
  /** Optional execution duration in milliseconds */
  duration?: number;
};

// =============================================================================
// SAFE PARSE RESULT (moved from utils/json/safeParse.ts)
// =============================================================================

/**
 * Result type for safe JSON parsing operations
 */
export type SafeParseResult<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};

// =============================================================================
// RETRY OPTIONS (moved from utils/async/retry.ts)
// =============================================================================

/**
 * Configuration options for retry operations with exponential backoff.
 * Named AsyncRetryOptions to avoid collision with utilities.ts RetryOptions.
 */
export type AsyncRetryOptions = {
  /**
   * Maximum number of retry attempts (not including the initial attempt).
   * @default 3
   */
  maxRetries: number;

  /**
   * Initial delay between retries in milliseconds.
   * @default 1000
   */
  baseDelayMs: number;

  /**
   * Maximum delay cap in milliseconds.
   * @default 30000
   */
  maxDelayMs: number;

  /**
   * Multiplier for exponential backoff.
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Function to determine if a retry should be attempted.
   * Return false to stop retrying immediately.
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;

  /**
   * Whether to add random jitter to backoff delays to prevent thundering herd.
   * @default true
   */
  addJitter?: boolean;

  /**
   * Callback invoked before each retry attempt.
   * Useful for logging or metrics.
   */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
};

// =============================================================================
// TOKEN UTILS TYPES (moved from utils/tokenUtils.ts)
// =============================================================================

/**
 * Raw usage object that may come from various AI providers.
 * Supports multiple naming conventions and nested structures.
 */
export type RawUsageObject = {
  // BaseProvider normalized format
  input?: number;
  output?: number;
  total?: number;

  // AI SDK format
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;

  // OpenAI/Mistral format
  promptTokens?: number;
  completionTokens?: number;

  // Anthropic-style cache tokens
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;

  // OpenAI o1/Anthropic reasoning tokens
  reasoningTokens?: number;
  reasoning?: number;
  reasoning_tokens?: number;
  thinkingTokens?: number;

  // Nested usage object (some providers wrap usage)
  usage?: RawUsageObject;
};

/**
 * Options for token extraction from raw usage objects.
 */
export type TokenExtractionOptions = {
  /**
   * Whether to calculate cache savings percentage
   * @default true
   */
  calculateCacheSavings?: boolean;

  /**
   * How to handle missing optional fields
   * - "zero": Return 0 for missing optional fields
   * - "undefined": Return undefined for missing optional fields (default)
   */
  missingOptionalBehavior?: "zero" | "undefined";
};

// =============================================================================
// MODEL CHOICE TYPE (moved from utils/modelChoices.ts)
// =============================================================================

/**
 * Model choice for CLI prompts (inquirer format)
 */
export type ModelChoice = {
  name: string;
  value: string;
  description?: string;
};

// =============================================================================
// INFRASTRUCTURE TYPES (moved from core/infrastructure/)
// =============================================================================

/** Factory function type for creating instances. */
export type FactoryFunction<TInstance, TConfig> = (
  config?: TConfig,
) => Promise<TInstance>;

/** Factory registration entry. */
export type FactoryRegistration<TInstance, TConfig> = {
  factory: FactoryFunction<TInstance, TConfig>;
  aliases: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Registry entry for lazy-loaded items in BaseRegistry.
 * Named InfraRegistryEntry to avoid collision with workflowTypes.ts RegistryEntry.
 */
export type InfraRegistryEntry<TItem, TMetadata = unknown> = {
  factory: () => Promise<TItem>;
  metadata: TMetadata;
  instance?: TItem;
};

/** Error code type (string-based). */
export type ErrorCode = string;

// =============================================================================
// TOOL UTILITIES (moved from core/modules/ToolsManager.ts)
// =============================================================================

import type { z } from "zod";

/** Utility functions for tool management. */
export type ToolUtilities = {
  isZodSchema?: (schema: unknown) => boolean;
  convertToolResult?: (result: unknown) => Promise<unknown>;
  createPermissiveZodSchema?: () => z.ZodSchema;
  fixSchemaForOpenAIStrictMode?: (
    schema: Record<string, unknown>,
  ) => Record<string, unknown>;
};
