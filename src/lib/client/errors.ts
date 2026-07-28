/**
 * Error Classes for NeuroLink Client SDK
 *
 * Provides comprehensive error classification and handling for API errors,
 * network errors, validation errors, and more.
 *
 * @module @neurolink/client/errors
 */

import type {
  ClientApiError,
  ErrorCodeType,
  JsonObject,
} from "../types/index.js";

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Standard error codes for NeuroLink API errors
 */
export const ErrorCode = {
  // Client Errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_REQUEST: "INVALID_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Server Errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
  BAD_GATEWAY: "BAD_GATEWAY",

  // Network Errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  CONNECTION_REFUSED: "CONNECTION_REFUSED",
  DNS_ERROR: "DNS_ERROR",

  // Client-Side Errors
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  SERIALIZATION_ERROR: "SERIALIZATION_ERROR",
  STREAM_ERROR: "STREAM_ERROR",
  ABORT_ERROR: "ABORT_ERROR",

  // Provider Errors
  PROVIDER_ERROR: "PROVIDER_ERROR",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  CONTEXT_LENGTH_EXCEEDED: "CONTEXT_LENGTH_EXCEEDED",
  CONTENT_FILTERED: "CONTENT_FILTERED",

  // Unknown
  UNKNOWN: "UNKNOWN",
} as const;

// =============================================================================
// Base Error Class
// =============================================================================

/**
 * Base error class for all NeuroLink client errors
 *
 * Provides consistent error structure with error codes, status codes,
 * and additional metadata.
 */
export class NeuroLinkError extends Error {
  /** Error code for programmatic handling */
  readonly code: ErrorCodeType;
  /** HTTP status code (if applicable) */
  readonly status?: number;
  /** Additional error details */
  readonly details?: JsonObject;
  /** Whether the error is retryable */
  readonly retryable: boolean;
  /** Request ID for error tracking */
  readonly requestId?: string;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.UNKNOWN,
    options?: {
      status?: number;
      details?: JsonObject;
      retryable?: boolean;
      requestId?: string;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "NeuroLinkError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;
    this.requestId = options?.requestId;
  }

  /**
   * Convert error to API error format
   */
  toApiError(): ClientApiError {
    return {
      code: this.code,
      message: this.message,
      status: this.status ?? 500,
      details: this.details,
      retryable: this.retryable,
      requestId: this.requestId,
    };
  }

  /**
   * Convert error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      retryable: this.retryable,
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

// =============================================================================
// HTTP Error Classes
// =============================================================================

/**
 * Error for HTTP-related failures
 */
export class HttpError extends NeuroLinkError {
  /** HTTP response headers */
  readonly headers?: Record<string, string>;
  /** HTTP response body */
  readonly body?: unknown;

  constructor(
    message: string,
    status: number,
    options?: {
      code?: ErrorCodeType;
      details?: JsonObject;
      headers?: Record<string, string>;
      body?: unknown;
      requestId?: string;
    },
  ) {
    const code = options?.code ?? mapStatusToErrorCode(status);
    const retryable = isRetryableStatus(status);

    super(message, code, {
      status,
      details: options?.details,
      retryable,
      requestId: options?.requestId,
    });

    this.name = "HttpError";
    this.headers = options?.headers;
    this.body = options?.body;
  }
}

/**
 * Error for rate limiting (429)
 */
export class ClientRateLimitError extends HttpError {
  /** Retry-After value in seconds (if provided) */
  readonly retryAfter?: number;
  /** Rate limit reset time */
  readonly resetAt?: Date;

  constructor(
    message: string = "Rate limit exceeded",
    options?: {
      retryAfter?: number;
      resetAt?: Date;
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message, 429, {
      code: ErrorCode.RATE_LIMITED,
      details: options?.details,
      requestId: options?.requestId,
    });

    this.name = "ClientRateLimitError";
    this.retryAfter = options?.retryAfter;
    this.resetAt = options?.resetAt;
  }
}

/**
 * Error for validation failures (400)
 */
export class ClientValidationError extends HttpError {
  /** Field-level validation errors */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    options?: {
      fieldErrors?: Record<string, string[]>;
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message, 400, {
      code: ErrorCode.VALIDATION_ERROR,
      details: {
        ...options?.details,
        ...(options?.fieldErrors && {
          fieldErrors: options.fieldErrors,
        }),
      },
      requestId: options?.requestId,
    });

    this.name = "ClientValidationError";
    this.fieldErrors = options?.fieldErrors;
  }
}

/**
 * Error for authentication failures (401)
 */
export class ClientAuthenticationError extends HttpError {
  constructor(
    message: string = "Authentication required",
    options?: {
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message, 401, {
      code: ErrorCode.UNAUTHORIZED,
      details: options?.details,
      requestId: options?.requestId,
    });

    this.name = "ClientAuthenticationError";
  }
}

/**
 * Error for authorization failures (403)
 */
export class ClientAuthorizationError extends HttpError {
  constructor(
    message: string = "Access forbidden",
    options?: {
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message, 403, {
      code: ErrorCode.FORBIDDEN,
      details: options?.details,
      requestId: options?.requestId,
    });

    this.name = "ClientAuthorizationError";
  }
}

/**
 * Error for not found (404)
 */
export class NotFoundError extends HttpError {
  /** Resource type that was not found */
  readonly resourceType?: string;
  /** Resource ID that was not found */
  readonly resourceId?: string;

  constructor(
    message: string = "Resource not found",
    options?: {
      resourceType?: string;
      resourceId?: string;
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message, 404, {
      code: ErrorCode.NOT_FOUND,
      details: {
        ...options?.details,
        ...(options?.resourceType && { resourceType: options.resourceType }),
        ...(options?.resourceId && { resourceId: options.resourceId }),
      },
      requestId: options?.requestId,
    });

    this.name = "NotFoundError";
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
}

// =============================================================================
// Network Error Classes
// =============================================================================

/**
 * Error for network-related failures
 */
export class ClientNetworkError extends NeuroLinkError {
  constructor(
    message: string = "Network error occurred",
    options?: {
      code?: ErrorCodeType;
      details?: JsonObject;
      cause?: Error;
      requestId?: string;
    },
  ) {
    super(message, options?.code ?? ErrorCode.NETWORK_ERROR, {
      details: options?.details,
      retryable: true,
      cause: options?.cause,
      requestId: options?.requestId,
    });

    this.name = "ClientNetworkError";
  }
}

/**
 * Error for request timeout
 */
export class ClientTimeoutError extends ClientNetworkError {
  /** Timeout duration in milliseconds */
  readonly timeoutMs: number;

  constructor(
    timeoutMs: number,
    message?: string,
    options?: {
      details?: JsonObject;
      requestId?: string;
    },
  ) {
    super(message ?? `Request timed out after ${timeoutMs}ms`, {
      code: ErrorCode.TIMEOUT,
      details: {
        ...options?.details,
        timeoutMs,
      },
      requestId: options?.requestId,
    });

    this.name = "ClientTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error for connection refused
 */
export class ClientConnectionError extends ClientNetworkError {
  /** Target host */
  readonly host?: string;
  /** Target port */
  readonly port?: number;

  constructor(
    message: string = "Connection refused",
    options?: {
      host?: string;
      port?: number;
      details?: JsonObject;
      cause?: Error;
      requestId?: string;
    },
  ) {
    super(message, {
      code: ErrorCode.CONNECTION_REFUSED,
      details: {
        ...options?.details,
        ...(options?.host && { host: options.host }),
        ...(options?.port !== undefined && { port: options.port }),
      },
      cause: options?.cause,
      requestId: options?.requestId,
    });

    this.name = "ClientConnectionError";
    this.host = options?.host;
    this.port = options?.port;
  }
}

// =============================================================================
// Client-Side Error Classes
// =============================================================================

/**
 * Error for request cancellation
 */
export class AbortError extends NeuroLinkError {
  constructor(
    message: string = "Request was aborted",
    options?: {
      requestId?: string;
    },
  ) {
    super(message, ErrorCode.ABORT_ERROR, {
      retryable: false,
      requestId: options?.requestId,
    });

    this.name = "AbortError";
  }
}

/**
 * Error for configuration issues
 */
export class ClientConfigurationError extends NeuroLinkError {
  /** Configuration field with issue */
  readonly field?: string;

  constructor(
    message: string,
    options?: {
      field?: string;
      details?: JsonObject;
    },
  ) {
    super(message, ErrorCode.CONFIGURATION_ERROR, {
      details: {
        ...options?.details,
        ...(options?.field && { field: options.field }),
      },
      retryable: false,
    });

    this.name = "ClientConfigurationError";
    this.field = options?.field;
  }
}

/**
 * Error for stream processing failures
 */
export class StreamError extends NeuroLinkError {
  constructor(
    message: string = "Stream processing failed",
    options?: {
      details?: JsonObject;
      cause?: Error;
      requestId?: string;
    },
  ) {
    super(message, ErrorCode.STREAM_ERROR, {
      details: options?.details,
      retryable: false,
      cause: options?.cause,
      requestId: options?.requestId,
    });

    this.name = "StreamError";
  }
}

// =============================================================================
// Provider Error Classes
// =============================================================================

/**
 * Error from AI provider
 */
export class ClientProviderError extends NeuroLinkError {
  /** Provider name */
  readonly provider?: string;
  /** Model name */
  readonly model?: string;
  /** Original provider error */
  readonly providerError?: unknown;

  constructor(
    message: string,
    options?: {
      provider?: string;
      model?: string;
      providerError?: unknown;
      status?: number;
      details?: JsonObject;
      retryable?: boolean;
      requestId?: string;
    },
  ) {
    super(message, ErrorCode.PROVIDER_ERROR, {
      status: options?.status,
      details: {
        ...options?.details,
        ...(options?.provider && { provider: options.provider }),
        ...(options?.model && { model: options.model }),
      },
      retryable: options?.retryable ?? false,
      requestId: options?.requestId,
    });

    this.name = "ClientProviderError";
    this.provider = options?.provider;
    this.model = options?.model;
    this.providerError = options?.providerError;
  }
}

/**
 * Error for context length exceeded
 */
export class ContextLengthError extends ClientProviderError {
  /** Maximum allowed tokens */
  readonly maxTokens?: number;
  /** Requested tokens */
  readonly requestedTokens?: number;

  constructor(
    message: string = "Context length exceeded",
    options?: {
      maxTokens?: number;
      requestedTokens?: number;
      provider?: string;
      model?: string;
      requestId?: string;
    },
  ) {
    super(message, {
      provider: options?.provider,
      model: options?.model,
      details: {
        ...(options?.maxTokens !== undefined && {
          maxTokens: options.maxTokens,
        }),
        ...(options?.requestedTokens !== undefined && {
          requestedTokens: options.requestedTokens,
        }),
      },
      retryable: false,
      requestId: options?.requestId,
    });

    this.name = "ContextLengthError";
    this.maxTokens = options?.maxTokens;
    this.requestedTokens = options?.requestedTokens;
  }
}

/**
 * Error for content filtering
 */
export class ContentFilterError extends ClientProviderError {
  /** Filter category that triggered */
  readonly category?: string;

  constructor(
    message: string = "Content was filtered",
    options?: {
      category?: string;
      provider?: string;
      model?: string;
      requestId?: string;
    },
  ) {
    super(message, {
      provider: options?.provider,
      model: options?.model,
      details: {
        ...(options?.category && { category: options.category }),
      },
      retryable: false,
      requestId: options?.requestId,
    });

    this.name = "ContentFilterError";
    this.category = options?.category;
  }
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Create an error from an API error response
 */
export function createErrorFromResponse(
  apiError: ClientApiError,
  options?: { requestId?: string },
): NeuroLinkError {
  const { code, message, status, details, retryable } = apiError;

  // Map to specific error class based on status
  if (status === 401) {
    return new ClientAuthenticationError(message, {
      details,
      requestId: options?.requestId,
    });
  }
  if (status === 403) {
    return new ClientAuthorizationError(message, {
      details,
      requestId: options?.requestId,
    });
  }
  if (status === 404) {
    return new NotFoundError(message, {
      details,
      requestId: options?.requestId,
    });
  }
  if (status === 429) {
    return new ClientRateLimitError(message, {
      details,
      requestId: options?.requestId,
    });
  }
  if (status === 400 && code === "VALIDATION_ERROR") {
    return new ClientValidationError(message, {
      details,
      requestId: options?.requestId,
    });
  }

  // Generic HTTP error
  if (status) {
    return new HttpError(message, status, {
      code: code as ErrorCodeType,
      details,
      requestId: options?.requestId,
    });
  }

  // Generic error
  return new NeuroLinkError(message, code as ErrorCodeType, {
    details,
    retryable: retryable ?? false,
    requestId: options?.requestId,
  });
}

/**
 * Create an error from a native Error object
 */
export function createErrorFromNative(
  error: Error,
  options?: { requestId?: string },
): NeuroLinkError {
  // Handle AbortError
  if (error.name === "AbortError") {
    return new AbortError(error.message, { requestId: options?.requestId });
  }

  // Handle timeout
  if (error.message.includes("timeout") || error.name === "TimeoutError") {
    return new ClientTimeoutError(0, error.message, {
      requestId: options?.requestId,
    });
  }

  // Handle network errors
  if (
    error.message.includes("network") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ENOTFOUND")
  ) {
    return new ClientNetworkError(error.message, {
      cause: error,
      requestId: options?.requestId,
    });
  }

  // Generic error
  return new NeuroLinkError(error.message, ErrorCode.UNKNOWN, {
    cause: error,
    requestId: options?.requestId,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map HTTP status code to error code
 */
export function mapStatusToErrorCode(status: number): ErrorCodeType {
  const mapping: Record<number, ErrorCodeType> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.METHOD_NOT_ALLOWED,
    409: ErrorCode.CONFLICT,
    413: ErrorCode.PAYLOAD_TOO_LARGE,
    429: ErrorCode.RATE_LIMITED,
    500: ErrorCode.INTERNAL_ERROR,
    502: ErrorCode.BAD_GATEWAY,
    503: ErrorCode.SERVICE_UNAVAILABLE,
    504: ErrorCode.GATEWAY_TIMEOUT,
  };

  return (
    mapping[status] ??
    (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.UNKNOWN)
  );
}

/**
 * Check if a status code is retryable
 */
export function isRetryableStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NeuroLinkError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    // Network errors are generally retryable
    if (
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Type guard for NeuroLinkError
 */
export function isNeuroLinkError(error: unknown): error is NeuroLinkError {
  return error instanceof NeuroLinkError;
}

/**
 * Type guard for ClientApiError
 */
export function isApiError(error: unknown): error is ClientApiError {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const obj = error as Record<string, unknown>;
  return typeof obj.code === "string" && typeof obj.message === "string";
}
