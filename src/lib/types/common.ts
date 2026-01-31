/**
 * Common utility types for NeuroLink
 */

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
