/**
 * Error handling system for Amazon SageMaker Provider
 *
 * This module provides comprehensive error handling, categorization,
 * and user-friendly error messages for SageMaker operations.
 */

import type {
  SageMakerErrorCode,
  SageMakerErrorInfo,
} from "../../types/providers.js";
import type { UnknownRecord } from "../../types/common.js";
import {
  ERROR_MESSAGE_TEMPLATES,
  ERROR_MESSAGE_PREFIXES,
  RETRY_DELAYS,
  RETRYABLE_ERROR_CONDITIONS,
  ERROR_KEYWORDS,
} from "./error-constants.js";

/**
 * Custom error class for SageMaker-specific errors
 */
export class SageMakerError extends Error {
  public readonly code: SageMakerErrorCode;
  public readonly statusCode?: number;
  public readonly cause?: Error;
  public readonly endpoint?: string;
  public readonly requestId?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      code?: SageMakerErrorCode;
      statusCode?: number;
      cause?: Error;
      endpoint?: string;
      requestId?: string;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "SageMakerError";
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.statusCode = options.statusCode;
    this.cause = options.cause;
    this.endpoint = options.endpoint;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SageMakerError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): SageMakerErrorInfo & { stack?: string } {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      cause: this.cause,
      endpoint: this.endpoint,
      requestId: this.requestId,
      retryable: this.retryable,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message with troubleshooting guidance
   */
  getUserFriendlyMessage(): string {
    return getSageMakerErrorGuidance(this.code, this.message, this.endpoint);
  }

  /**
   * Check if this error type is retryable
   */
  isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * Get recommended retry delay in milliseconds
   */
  getRetryDelay(): number {
    return (
      (RETRY_DELAYS as Record<string, number>)[this.code] ||
      RETRY_DELAYS.DEFAULT
    );
  }
}

/**
 * Main error handler for SageMaker operations
 *
 * @param error - Original error from AWS SDK or other operations
 * @param endpoint - Endpoint name where error occurred (optional)
 * @returns Categorized SageMakerError with user guidance
 */
export function handleSageMakerError(
  error: unknown,
  endpoint?: string,
): SageMakerError {
  // Handle cases where error is already a SageMakerError
  if (error instanceof SageMakerError) {
    return error;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const errorName = error.name;
    const errorMessage = error.message.toLowerCase();

    // AWS SDK specific errors using centralized constants
    if (
      errorName === "ValidationException" ||
      ERROR_KEYWORDS.VALIDATION.some((keyword) =>
        errorMessage.includes(keyword),
      )
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.VALIDATION}: ${error.message}`,
        {
          code: "VALIDATION_ERROR",
          statusCode: 400,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: false,
        },
      );
    }

    if (
      errorName === "ModelError" ||
      ERROR_KEYWORDS.MODEL.some((keyword) => errorMessage.includes(keyword))
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.MODEL}: ${error.message}`,
        {
          code: "MODEL_ERROR",
          statusCode: 500,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: false,
        },
      );
    }

    if (
      errorName === "InternalFailure" ||
      ERROR_KEYWORDS.INTERNAL.some((keyword) => errorMessage.includes(keyword))
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.INTERNAL}: ${error.message}`,
        {
          code: "INTERNAL_ERROR",
          statusCode: 500,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: true,
        },
      );
    }

    if (
      errorName === "ServiceUnavailable" ||
      ERROR_KEYWORDS.SERVICE_UNAVAILABLE.some((keyword) =>
        errorMessage.includes(keyword),
      )
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.SERVICE_UNAVAILABLE}: ${error.message}`,
        {
          code: "SERVICE_UNAVAILABLE",
          statusCode: 503,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: true,
        },
      );
    }

    if (
      errorName === "ThrottlingException" ||
      ERROR_KEYWORDS.THROTTLING.some((keyword) =>
        errorMessage.includes(keyword),
      )
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.THROTTLING}: ${error.message}`,
        {
          code: "THROTTLING_ERROR",
          statusCode: 429,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: true,
        },
      );
    }

    if (
      errorName === "CredentialsError" ||
      ERROR_KEYWORDS.CREDENTIALS.some((keyword) =>
        errorMessage.includes(keyword),
      )
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.CREDENTIALS}: ${error.message}`,
        {
          code: "CREDENTIALS_ERROR",
          statusCode: 401,
          cause: error,
          endpoint,
          requestId: undefined,
          retryable: false,
        },
      );
    }

    if (
      errorName === "NetworkingError" ||
      ERROR_KEYWORDS.NETWORK.some((keyword) => errorMessage.includes(keyword))
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.NETWORK}: ${error.message}`,
        {
          code: "NETWORK_ERROR",
          statusCode: 0,
          cause: error,
          endpoint,
          requestId: undefined,
          retryable: true,
        },
      );
    }

    if (
      ERROR_KEYWORDS.ENDPOINT_NOT_FOUND.every((keyword) =>
        errorMessage.includes(keyword),
      )
    ) {
      return new SageMakerError(
        `${ERROR_MESSAGE_PREFIXES.ENDPOINT_NOT_FOUND}: ${error.message}`,
        {
          code: "ENDPOINT_NOT_FOUND",
          statusCode: 404,
          cause: error,
          endpoint,
          requestId: extractRequestId(error),
          retryable: false,
        },
      );
    }

    // Generic error handling
    return new SageMakerError(error.message, {
      code: "UNKNOWN_ERROR",
      statusCode: 500,
      cause: error,
      endpoint,
      requestId: extractRequestId(error),
      retryable: false,
    });
  }

  // Handle non-Error objects
  const errorMessage =
    typeof error === "string" ? error : "Unknown error occurred";
  return new SageMakerError(errorMessage, {
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    cause: undefined,
    endpoint,
    requestId: undefined,
    retryable: false,
  });
}

/**
 * Extract request ID from AWS SDK error for debugging
 *
 * @param error - Error object that might contain request ID
 * @returns Request ID if found, undefined otherwise
 */
function extractRequestId(error: Error): string | undefined {
  const errorAny = error as unknown as UnknownRecord;
  return (
    (errorAny.requestId as string) ||
    (errorAny.RequestId as string) ||
    ((errorAny.$metadata as UnknownRecord)?.requestId as string) ||
    undefined
  );
}

/**
 * Get user-friendly error guidance based on error code
 *
 * @param code - SageMaker error code
 * @param originalMessage - Original error message
 * @param endpoint - Endpoint name (optional)
 * @returns User-friendly error message with troubleshooting steps
 */
function getSageMakerErrorGuidance(
  code: SageMakerErrorCode,
  originalMessage: string,
  endpoint?: string,
): string {
  const endpointContext = endpoint ? ` (endpoint: ${endpoint})` : "";

  // Get template for the error code, falling back to default
  const template =
    ERROR_MESSAGE_TEMPLATES[code] || ERROR_MESSAGE_TEMPLATES.DEFAULT;

  // Replace placeholders in the template
  return template
    .replace("{endpointContext}", endpointContext)
    .replace("{originalMessage}", originalMessage);
}

/**
 * Create a validation error for configuration issues
 *
 * @param message - Validation error message
 * @param field - Configuration field that failed validation
 * @returns SageMakerError with validation details
 */
export function createValidationError(
  message: string,
  field?: string,
): SageMakerError {
  const fullMessage = field
    ? `${ERROR_MESSAGE_PREFIXES.VALIDATION_FIELD} '${field}': ${message}`
    : message;
  return new SageMakerError(fullMessage, {
    code: "VALIDATION_ERROR",
    statusCode: 400,
    retryable: false,
  });
}

/**
 * Create a credentials error with setup guidance
 *
 * @param message - Credentials error message
 * @returns SageMakerError with credentials guidance
 */
export function createCredentialsError(message: string): SageMakerError {
  return new SageMakerError(
    `${ERROR_MESSAGE_PREFIXES.CREDENTIALS_SETUP}: ${message}`,
    {
      code: "CREDENTIALS_ERROR",
      statusCode: 401,
      retryable: false,
    },
  );
}

/**
 * Create a network error with connectivity guidance
 *
 * @param message - Network error message
 * @param endpoint - Endpoint that failed to connect
 * @returns SageMakerError with network guidance
 */
export function createNetworkError(
  message: string,
  endpoint?: string,
): SageMakerError {
  return new SageMakerError(
    `${ERROR_MESSAGE_PREFIXES.NETWORK_CONNECTION}: ${message}`,
    {
      code: "NETWORK_ERROR",
      statusCode: 0,
      endpoint,
      retryable: true,
    },
  );
}

/**
 * Check if an error is retryable based on its characteristics
 *
 * @param error - Error to check
 * @returns True if the error suggests a retry might succeed
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SageMakerError) {
    return error.isRetryable();
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name;

    // Check against retryable error names and message keywords
    return (
      RETRYABLE_ERROR_CONDITIONS.ERROR_NAMES.includes(
        errorName as (typeof RETRYABLE_ERROR_CONDITIONS.ERROR_NAMES)[number],
      ) ||
      RETRYABLE_ERROR_CONDITIONS.ERROR_MESSAGE_KEYWORDS.some((keyword) =>
        errorMessage.includes(keyword),
      )
    );
  }

  return false;
}

/**
 * Get recommended retry delay for an error
 *
 * @param error - Error to get retry delay for
 * @param attempt - Current retry attempt number (for exponential backoff)
 * @returns Recommended delay in milliseconds
 */
export function getRetryDelay(error: unknown, attempt: number = 1): number {
  if (error instanceof SageMakerError) {
    return error.getRetryDelay() * Math.pow(2, attempt - 1);
  }

  // Default exponential backoff
  return 1000 * Math.pow(2, attempt - 1);
}
