/**
 * Common utility types for NeuroLink
 */

import type { NeuroLink } from "../neurolink.js";
import type { ConversationMemoryConfig } from "./conversation.js";
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
} from "./autoresearch.js";

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
export type InternalStreamEvent = {
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
// INFRASTRUCTURE RETRY OPTIONS (moved from core/infrastructure/retry.ts)
// =============================================================================

/**
 * Simple retry options for infrastructure-level retry logic.
 * Named InfraRetryOptions to avoid collision with utilities.ts RetryOptions and
 * common.ts AsyncRetryOptions.
 */
export type InfraRetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
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

  // OpenAI/DeepSeek/NIM/OpenAI-compatible nested cache field (overlapping:
  // cached_tokens is a SUBSET already included in prompt_tokens)
  prompt_tokens_details?: { cached_tokens?: number };

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
import type { TTSOptions, TTSResult, TTSVoice } from "./tts.js";
import type { SageMakerStreamChunk, SageMakerUsage } from "./providers.js";

/** Utility functions for tool management. */
export type ToolUtilities = {
  isZodSchema?: (schema: unknown) => boolean;
  convertToolResult?: (result: unknown) => Promise<unknown>;
  createPermissiveZodSchema?: () => z.ZodSchema;
  fixSchemaForOpenAIStrictMode?: (
    schema: Record<string, unknown>,
  ) => Record<string, unknown>;
};

/**
 * TTS Handler interface for provider-specific implementations
 *
 * Each provider (Google AI, OpenAI, etc.) implements this interface
 * to provide TTS generation capabilities using their respective APIs.
 *
 * **Timeout Handling:**
 * Implementations MUST handle their own timeouts for the `synthesize()` method.
 * Recommended timeout: 30 seconds. Implementations should use `withTimeout()` utility
 * or provider-specific timeout mechanisms (e.g., Google Cloud client timeout).
 *
 * **Error Handling:**
 * Implementations should throw TTSError for all failures, including timeouts.
 * Use appropriate error codes from TTS_ERROR_CODES.
 *
 * @example
 * ```typescript
 * class MyTTSHandler implements TTSHandler {
 *   async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
 *     // REQUIRED: Implement timeout handling
 *     return await withTimeout(
 *       this.actualSynthesis(text, options),
 *       30000, // 30 second timeout
 *       'TTS synthesis timed out'
 *     );
 *   }
 *
 *   isConfigured(): boolean {
 *     return !!process.env.MY_TTS_API_KEY;
 *   }
 * }
 * ```
 */

export type TTSHandler = {
  /**
   * Generate audio from text using provider-specific TTS API
   *
   * **IMPORTANT: Timeout Responsibility**
   * Implementations MUST enforce their own timeouts (recommended: 30 seconds).
   * Use the `withTimeout()` utility or provider-specific timeout mechanisms.
   *
   * @param text - Text to convert to speech (pre-validated, non-empty, within length limits)
   * @param options - TTS configuration options (voice, format, speed, etc.)
   * @returns Audio buffer with metadata
   * @throws {TTSError} On synthesis failure, timeout, or configuration issues
   */
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;

  /**
   * Get available voices for the provider
   *
   * @param languageCode - Optional language filter (e.g., "en-US")
   * @returns List of available voices
   */
  getVoices?(languageCode?: string): Promise<TTSVoice[]>;

  /**
   * Validate that the provider is properly configured
   *
   * @returns True if provider can generate TTS
   */
  isConfigured(): boolean;

  /**
   * Maximum text length supported by this provider (in bytes)
   * Different providers have different limits
   *
   * @default 3000 if not specified
   */
  maxTextLength?: number;
};

// Initial backoff on rate limit detection (ms)

/**
 * Streaming capability information for an endpoint
 */

export type StreamingCapability = {
  /** Whether streaming is supported */
  supported: boolean;
  /** Detected streaming protocol */
  protocol: "sse" | "jsonl" | "chunked" | "none";
  /** Detected model framework */
  modelType: "huggingface" | "llama" | "pytorch" | "tensorflow" | "custom";
  /** Test endpoint for streaming validation */
  testEndpoint?: string;
  /** Required parameters for streaming */
  parameters?: Record<string, unknown>;
  /** Confidence level of detection (0-1) */
  confidence: number;
  /** Additional metadata about the model */
  metadata?: {
    modelName?: string;
    framework?: string;
    version?: string;
    tags?: string[];
  };
};

// Minimum length for JSON object "{}"

/**
 * Shared bracket counting state and utilities
 * Used by both validateJSONCompleteness and StructuredOutputParser
 */

export type BracketCountingState = {
  braceCount: number;
  bracketCount: number;
  inString: boolean;
  escapeNext: boolean;
};

/**
 * Base interface for streaming response parsers
 */

export type StreamingParser = {
  /** Parse a chunk of streaming data */
  parse(chunk: Uint8Array): SageMakerStreamChunk[];

  /** Check if a chunk indicates completion */
  isComplete(chunk: SageMakerStreamChunk): boolean;

  /** Extract final usage information */
  extractUsage(finalChunk: SageMakerStreamChunk): SageMakerUsage | undefined;

  /** Get parser name for debugging */
  getName(): string;

  /** Reset parser state for new stream */
  reset(): void;
};

// HippocampusMemory has moved to ./memory.ts where the local structural
// definition lives. Keeping the type out of this file avoids re-exporting
// the same name from two source locations and breaks the previous
// dependency on `import("@juspay/hippocampus")` at the type level.

// =============================================================================
// SESSION STATE (from session/globalSessionState.ts)
// =============================================================================

/** Value types accepted as session variables by the loop REPL. */
export type SessionVariableValue = string | number | boolean;

/** State snapshot for the active REPL loop session. */
export type LoopSessionState = {
  neurolinkInstance: NeuroLink;
  sessionId: string;
  isActive: boolean;
  conversationMemoryConfig?: ConversationMemoryConfig;
  sessionVariables: Record<string, SessionVariableValue>;
};
