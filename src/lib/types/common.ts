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
 * JSON-serializable value type
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> {}

/**
 * Type-safe error handling
 */
export interface ErrorInfo {
  message: string;
  code?: string | number;
  stack?: string;
  cause?: unknown;
}

/**
 * Generic success/error result type
 */
export interface Result<T = unknown, E = ErrorInfo> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Function parameter type for dynamic functions
 */
export interface FunctionParameters {
  [key: string]: unknown;
}

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
