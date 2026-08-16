/**
 * Server Adapter Error Classes
 *
 * Typed error hierarchy for server adapters following NeuroLink error patterns.
 */

import {
  type ErrorCategoryType,
  ErrorCategory,
  type ErrorSeverityType,
  ErrorSeverity,
  type ServerAdapterErrorCodeType,
  ServerAdapterErrorCode,
  type ServerAdapterErrorContext,
} from "../types/index.js";

/**
 * Base error class for server adapter errors
 */
export class ServerAdapterError extends Error {
  readonly code: ServerAdapterErrorCodeType;
  readonly category: ErrorCategoryType;
  readonly severity: ErrorSeverityType;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly requestId?: string;
  readonly path?: string;
  readonly method?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(
    message: string,
    code: ServerAdapterErrorCodeType,
    context: Partial<ServerAdapterErrorContext> = {},
  ) {
    super(message);
    this.name = "ServerAdapterError";
    this.code = code;
    this.category = context.category ?? ErrorCategory.EXECUTION;
    this.severity = context.severity ?? ErrorSeverity.MEDIUM;
    this.retryable = context.retryable ?? false;
    this.retryAfterMs = context.retryAfterMs;
    this.requestId = context.requestId;
    this.path = context.path;
    this.method = context.method;
    this.details = context.details;
    this.cause = context.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerAdapterError);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
        requestId: this.requestId,
        details: this.details,
        retryAfter: this.retryAfterMs
          ? Math.ceil(this.retryAfterMs / 1000)
          : undefined,
      },
    };
  }

  /**
   * Get HTTP status code for this error
   */
  getHttpStatus(): number {
    switch (this.code) {
      case ServerAdapterErrorCode.VALIDATION_ERROR:
      case ServerAdapterErrorCode.SCHEMA_ERROR:
      case ServerAdapterErrorCode.INVALID_CONFIG:
      case ServerAdapterErrorCode.INVALID_ROUTE:
        return 400;

      case ServerAdapterErrorCode.AUTH_REQUIRED:
      case ServerAdapterErrorCode.AUTH_INVALID:
        return 401;

      case ServerAdapterErrorCode.FORBIDDEN:
        return 403;

      case ServerAdapterErrorCode.ROUTE_NOT_FOUND:
        return 404;

      case ServerAdapterErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;

      case ServerAdapterErrorCode.TIMEOUT:
        return 408;

      case ServerAdapterErrorCode.STREAM_ABORTED:
        return 499;

      default:
        return 500;
    }
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends ServerAdapterError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, ServerAdapterErrorCode.INVALID_CONFIG, {
      category: ErrorCategory.CONFIG,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details,
      cause,
    });
    this.name = "ConfigurationError";
  }
}

/**
 * Route conflict error
 */
export class RouteConflictError extends ServerAdapterError {
  constructor(path: string, method: string, existingRoute?: string) {
    super(
      `Route conflict: ${method} ${path} conflicts with existing route${existingRoute ? `: ${existingRoute}` : ""}`,
      ServerAdapterErrorCode.ROUTE_CONFLICT,
      {
        category: ErrorCategory.CONFIG,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        path,
        method,
        details: { existingRoute },
      },
    );
    this.name = "RouteConflictError";
  }
}

/**
 * Route not found error
 */
export class RouteNotFoundError extends ServerAdapterError {
  constructor(path: string, method: string, requestId?: string) {
    super(
      `Route not found: ${method} ${path}`,
      ServerAdapterErrorCode.ROUTE_NOT_FOUND,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        path,
        method,
        requestId,
      },
    );
    this.name = "RouteNotFoundError";
  }
}

/**
 * Validation error
 */
export class ValidationError extends ServerAdapterError {
  readonly errors: Array<{ field: string; message: string; value?: unknown }>;

  constructor(
    errors: Array<{ field: string; message: string; value?: unknown }>,
    requestId?: string,
  ) {
    super(
      `Validation failed: ${errors.map((e) => e.message).join(", ")}`,
      ServerAdapterErrorCode.VALIDATION_ERROR,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        requestId,
        details: { errors },
      },
    );
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ServerAdapterError {
  constructor(message: string = "Authentication required", requestId?: string) {
    super(message, ServerAdapterErrorCode.AUTH_REQUIRED, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      requestId,
    });
    this.name = "AuthenticationError";
  }
}

/**
 * Invalid authentication error
 */
export class InvalidAuthenticationError extends ServerAdapterError {
  constructor(
    message: string = "Invalid authentication credentials",
    requestId?: string,
  ) {
    super(message, ServerAdapterErrorCode.AUTH_INVALID, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      requestId,
    });
    this.name = "InvalidAuthenticationError";
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ServerAdapterError {
  constructor(
    message: string = "Access forbidden",
    requestId?: string,
    requiredPermissions?: string[],
  ) {
    super(message, ServerAdapterErrorCode.FORBIDDEN, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      requestId,
      details: { requiredPermissions },
    });
    this.name = "AuthorizationError";
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ServerAdapterError {
  constructor(retryAfterMs: number, message?: string, requestId?: string) {
    super(
      message ?? "Too many requests, please try again later",
      ServerAdapterErrorCode.RATE_LIMIT_EXCEEDED,
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        retryAfterMs,
        requestId,
      },
    );
    this.name = "RateLimitError";
  }
}

/**
 * Timeout error
 */
export class ServerTimeoutError extends ServerAdapterError {
  constructor(timeoutMs: number, operation?: string, requestId?: string) {
    super(
      `Operation timed out after ${timeoutMs}ms${operation ? `: ${operation}` : ""}`,
      ServerAdapterErrorCode.TIMEOUT,
      {
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        requestId,
        details: { timeoutMs, operation },
      },
    );
    this.name = "ServerTimeoutError";
  }
}

/**
 * Handler error
 */
export class HandlerError extends ServerAdapterError {
  constructor(
    message: string,
    cause?: Error,
    requestId?: string,
    path?: string,
    method?: string,
  ) {
    super(message, ServerAdapterErrorCode.HANDLER_ERROR, {
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      cause,
      requestId,
      path,
      method,
    });
    this.name = "HandlerError";
  }
}

/**
 * Streaming error
 */
export class StreamingError extends ServerAdapterError {
  constructor(message: string, cause?: Error, requestId?: string) {
    super(message, ServerAdapterErrorCode.STREAM_ERROR, {
      category: ErrorCategory.STREAMING,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      cause,
      requestId,
    });
    this.name = "StreamingError";
  }
}

/**
 * Stream aborted error
 */
export class StreamAbortedError extends ServerAdapterError {
  constructor(reason?: string, requestId?: string) {
    super(
      `Stream aborted${reason ? `: ${reason}` : ""}`,
      ServerAdapterErrorCode.STREAM_ABORTED,
      {
        category: ErrorCategory.STREAMING,
        severity: ErrorSeverity.LOW,
        retryable: false,
        requestId,
        details: { reason },
      },
    );
    this.name = "StreamAbortedError";
  }
}

/**
 * WebSocket error
 */
export class WebSocketError extends ServerAdapterError {
  constructor(message: string, cause?: Error, connectionId?: string) {
    super(message, ServerAdapterErrorCode.WEBSOCKET_ERROR, {
      category: ErrorCategory.WEBSOCKET,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      cause,
      details: { connectionId },
    });
    this.name = "WebSocketError";
  }
}

/**
 * WebSocket connection failed error
 */
export class WebSocketConnectionError extends ServerAdapterError {
  constructor(message: string = "WebSocket connection failed", cause?: Error) {
    super(message, ServerAdapterErrorCode.WEBSOCKET_CONNECTION_FAILED, {
      category: ErrorCategory.WEBSOCKET,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      cause,
    });
    this.name = "WebSocketConnectionError";
  }
}

/**
 * Server start error
 */
export class ServerStartError extends ServerAdapterError {
  constructor(message: string, cause?: Error, port?: number, host?: string) {
    super(message, ServerAdapterErrorCode.START_FAILED, {
      category: ErrorCategory.CONFIG,
      severity: ErrorSeverity.CRITICAL,
      retryable: true,
      cause,
      details: { port, host },
    });
    this.name = "ServerStartError";
  }
}

/**
 * Server stop error
 */
export class ServerStopError extends ServerAdapterError {
  constructor(message: string, cause?: Error) {
    super(message, ServerAdapterErrorCode.STOP_FAILED, {
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      cause,
    });
    this.name = "ServerStopError";
  }
}

/**
 * Already running error
 */
export class AlreadyRunningError extends ServerAdapterError {
  constructor(port?: number, host?: string) {
    super(
      `Server is already running${port && host ? ` on ${host}:${port}` : ""}`,
      ServerAdapterErrorCode.ALREADY_RUNNING,
      {
        category: ErrorCategory.CONFIG,
        severity: ErrorSeverity.LOW,
        retryable: false,
        details: { port, host },
      },
    );
    this.name = "AlreadyRunningError";
  }
}

/**
 * Not running error
 */
export class NotRunningError extends ServerAdapterError {
  constructor() {
    super("Server is not running", ServerAdapterErrorCode.NOT_RUNNING, {
      category: ErrorCategory.CONFIG,
      severity: ErrorSeverity.LOW,
      retryable: false,
    });
    this.name = "NotRunningError";
  }
}

/**
 * Shutdown timeout error
 * Thrown when graceful shutdown exceeds the configured timeout
 */
export class ShutdownTimeoutError extends ServerAdapterError {
  readonly timeoutMs: number;
  readonly remainingConnections: number;

  constructor(timeoutMs: number, remainingConnections: number) {
    super(
      `Shutdown timed out after ${timeoutMs}ms with ${remainingConnections} active connection(s)`,
      ServerAdapterErrorCode.STOP_FAILED,
      {
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        details: { timeoutMs, remainingConnections },
      },
    );
    this.name = "ShutdownTimeoutError";
    this.timeoutMs = timeoutMs;
    this.remainingConnections = remainingConnections;
  }
}

/**
 * Drain timeout error
 * Thrown when connection draining exceeds the configured timeout
 */
export class DrainTimeoutError extends ServerAdapterError {
  readonly timeoutMs: number;
  readonly remainingConnections: number;

  constructor(timeoutMs: number, remainingConnections: number) {
    super(
      `Connection drain timed out after ${timeoutMs}ms with ${remainingConnections} active connection(s)`,
      ServerAdapterErrorCode.STOP_FAILED,
      {
        category: ErrorCategory.EXECUTION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        details: { timeoutMs, remainingConnections },
      },
    );
    this.name = "DrainTimeoutError";
    this.timeoutMs = timeoutMs;
    this.remainingConnections = remainingConnections;
  }
}

/**
 * Invalid lifecycle state error
 * Thrown when attempting an operation in an invalid lifecycle state
 */
export class InvalidLifecycleStateError extends ServerAdapterError {
  readonly currentState: string;
  readonly expectedStates: string[];
  readonly operation: string;

  constructor(
    operation: string,
    currentState: string,
    expectedStates: string[],
  ) {
    super(
      `Cannot ${operation}: server is in '${currentState}' state, expected one of [${expectedStates.join(", ")}]`,
      ServerAdapterErrorCode.STOP_FAILED,
      {
        category: ErrorCategory.CONFIG,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        details: { operation, currentState, expectedStates },
      },
    );
    this.name = "InvalidLifecycleStateError";
    this.currentState = currentState;
    this.expectedStates = expectedStates;
    this.operation = operation;
  }
}

/**
 * Missing dependency error
 */
export class MissingDependencyError extends ServerAdapterError {
  constructor(dependency: string, framework: string, installCommand?: string) {
    super(
      `Missing dependency '${dependency}' for ${framework} adapter. ${installCommand ? `Install with: ${installCommand}` : ""}`,
      ServerAdapterErrorCode.MISSING_DEPENDENCY,
      {
        category: ErrorCategory.CONFIG,
        severity: ErrorSeverity.CRITICAL,
        retryable: false,
        details: { dependency, framework, installCommand },
      },
    );
    this.name = "MissingDependencyError";
  }
}

/**
 * Error recovery strategies
 */
export const ErrorRecoveryStrategies: Record<
  ErrorCategoryType,
  {
    strategy: "retry" | "exponentialBackoff" | "circuitBreak" | "fail";
    maxRetries: number;
    baseDelayMs: number;
  }
> = {
  [ErrorCategory.CONFIG]: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  [ErrorCategory.VALIDATION]: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  [ErrorCategory.EXECUTION]: {
    strategy: "retry",
    maxRetries: 3,
    baseDelayMs: 1000,
  },
  [ErrorCategory.EXTERNAL]: {
    strategy: "exponentialBackoff",
    maxRetries: 5,
    baseDelayMs: 1000,
  },
  [ErrorCategory.RATE_LIMIT]: {
    strategy: "exponentialBackoff",
    maxRetries: 3,
    baseDelayMs: 5000,
  },
  [ErrorCategory.AUTHENTICATION]: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  [ErrorCategory.AUTHORIZATION]: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  [ErrorCategory.STREAMING]: {
    strategy: "retry",
    maxRetries: 2,
    baseDelayMs: 500,
  },
  [ErrorCategory.WEBSOCKET]: {
    strategy: "exponentialBackoff",
    maxRetries: 5,
    baseDelayMs: 1000,
  },
};

/**
 * Helper to wrap errors as ServerAdapterError
 */
export function wrapError(
  error: unknown,
  requestId?: string,
  path?: string,
  method?: string,
): ServerAdapterError {
  if (error instanceof ServerAdapterError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new HandlerError(message, cause, requestId, path, method);
}
