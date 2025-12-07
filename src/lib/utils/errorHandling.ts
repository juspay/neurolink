/**
 * Robust Error Handling Utilities for NeuroLink
 * Provides structured error management for tool execution and system operations
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type { StructuredError } from "../types/utilities.js";
import { logger } from "./logger.js";
import {
  ERROR_CODES,
  ERROR_CODE_METADATA,
  type ErrorCode,
} from "../constants/errorCodes.js";

// Re-export ERROR_CODES for backward compatibility
export { ERROR_CODES, ERROR_CODE_METADATA, type ErrorCode };

/**
 * Enhanced error class with structured information
 *
 * Standard format:
 * - code: Standardized error code from ERROR_CODES
 * - message: Human-readable error message
 * - category: Error category (validation, execution, network, etc.)
 * - severity: Error severity level (low, medium, high, critical)
 * - retriable: Whether the operation can be retried
 * - context: Additional contextual information
 * - timestamp: When the error occurred
 * - httpStatusCode: Corresponding HTTP status code (if applicable)
 */
export class NeuroLinkError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retriable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly httpStatusCode?: number;
  public readonly toolName?: string;
  public readonly serverId?: string;
  public readonly provider?: string;

  constructor(options: {
    code: ErrorCode;
    message: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    retriable?: boolean;
    httpStatusCode?: number;
    context?: Record<string, unknown>;
    originalError?: Error;
    toolName?: string;
    serverId?: string;
    provider?: string;
  }) {
    super(options.message);
    this.name = "NeuroLinkError";
    this.code = options.code;

    // Use metadata if available, otherwise use provided values
    const metadata = ERROR_CODE_METADATA[options.code];
    this.category =
      options.category ||
      (metadata?.category as ErrorCategory) ||
      ErrorCategory.SYSTEM;
    this.severity =
      options.severity ||
      (metadata?.severity as ErrorSeverity) ||
      ErrorSeverity.MEDIUM;
    this.retriable = options.retriable ?? metadata?.retriable ?? false;
    this.httpStatusCode = options.httpStatusCode ?? metadata?.httpStatusCode;

    this.context = options.context || {};
    this.timestamp = new Date();
    this.toolName = options.toolName;
    this.serverId = options.serverId;
    this.provider = options.provider;

    // Preserve original error stack if provided, otherwise capture new stack trace
    if (options.originalError) {
      this.stack = options.originalError.stack;
      this.context.originalMessage = options.originalError.message;
      this.context.originalStack = options.originalError.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NeuroLinkError);
    }
  }

  /**
   * Convert to JSON for logging and serialization
   * Provides complete error information in a structured format
   */
  toJSON(): StructuredError & {
    httpStatusCode?: number;
    provider?: string;
  } {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retriable: this.retriable,
      httpStatusCode: this.httpStatusCode,
      context: this.context,
      timestamp: this.timestamp,
      toolName: this.toolName,
      serverId: this.serverId,
      provider: this.provider,
    };
  }

  /**
   * Get formatted error message for display
   */
  getFormattedMessage(): string {
    const parts = [`[${this.code}]`, this.message];

    if (this.provider) {
      parts.unshift(`[${this.provider}]`);
    }

    if (
      this.severity === ErrorSeverity.CRITICAL ||
      this.severity === ErrorSeverity.HIGH
    ) {
      parts.unshift(`[${this.severity.toUpperCase()}]`);
    }

    return parts.join(" ");
  }

  /**
   * Check if this error should be retried
   */
  shouldRetry(): boolean {
    return this.retriable;
  }
}

/**
 * Error factory for common error scenarios
 * Creates standardized NeuroLinkError instances with proper codes and metadata
 */
export class ErrorFactory {
  /**
   * Create a tool not found error
   */
  static toolNotFound(
    toolName: string,
    availableTools?: string[],
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_NOT_FOUND,
      message: `Tool '${toolName}' not found`,
      context: { toolName, availableTools },
      toolName,
    });
  }

  /**
   * Create a tool execution failed error
   */
  static toolExecutionFailed(
    toolName: string,
    originalError: Error,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      message: `Tool '${toolName}' execution failed: ${originalError.message}`,
      originalError,
      toolName,
      serverId,
    });
  }

  /**
   * Create a tool timeout error
   */
  static toolTimeout(
    toolName: string,
    timeoutMs: number,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_TIMEOUT,
      message: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
      context: { timeoutMs },
      toolName,
      serverId,
    });
  }

  /**
   * Create a parameter validation error for tools
   */
  static invalidParameters(
    toolName: string,
    validationError: Error,
    providedParams?: unknown,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_PARAMETER_INVALID,
      message: `Invalid parameters for tool '${toolName}': ${validationError.message}`,
      context: { providedParams },
      originalError: validationError,
      toolName,
    });
  }

  /**
   * Create a network error
   */
  static networkError(
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.NETWORK_ERROR,
      message: `Network error: ${message}`,
      originalError,
      context,
    });
  }

  /**
   * Create a memory exhaustion error
   */
  static memoryExhausted(
    context: string,
    memoryUsageMB?: number,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MEMORY_EXHAUSTED,
      message: `Memory exhausted: ${context}${memoryUsageMB ? ` (${memoryUsageMB}MB used)` : ""}`,
      context: { memoryUsageMB, context },
    });
  }

  /**
   * Create a provider authentication error
   */
  static providerAuthFailed(provider: string, message: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_AUTH_FAILED,
      message: `Authentication failed for provider '${provider}': ${message}`,
      provider,
    });
  }

  /**
   * Create a provider not found error
   */
  static providerNotFound(provider: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_NOT_FOUND,
      message: `Provider '${provider}' not found`,
      provider,
    });
  }

  /**
   * Create a provider rate limit error
   */
  static providerRateLimit(
    provider: string,
    retryAfter?: number,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.PROVIDER_RATE_LIMIT,
      message: `Rate limit exceeded for provider '${provider}'${retryAfter ? `, retry after ${retryAfter}s` : ""}`,
      provider,
      context: { retryAfter },
    });
  }

  /**
   * Create an MCP server not found error
   */
  static mcpServerNotFound(serverId: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MCP_SERVER_NOT_FOUND,
      message: `MCP server '${serverId}' not found`,
      serverId,
    });
  }

  /**
   * Create an MCP server connection failed error
   */
  static mcpServerConnectionFailed(
    serverId: string,
    originalError: Error,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MCP_SERVER_CONNECTION_FAILED,
      message: `Failed to connect to MCP server '${serverId}': ${originalError.message}`,
      serverId,
      originalError,
    });
  }

  /**
   * Create an MCP transport unsupported error
   */
  static mcpTransportUnsupported(transport: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.MCP_TRANSPORT_UNSUPPORTED,
      message: `Unsupported MCP transport type: ${transport}`,
      context: { transport },
    });
  }

  /**
   * Create a configuration error
   */
  static configInvalid(
    message: string,
    field?: string,
    value?: unknown,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: field
        ? ERROR_CODES.CONFIG_FIELD_INVALID
        : ERROR_CODES.CONFIG_INVALID,
      message: field
        ? `Invalid configuration field '${field}': ${message}`
        : message,
      context: { field, value },
    });
  }

  /**
   * Create a configuration missing error
   */
  static configMissing(field: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.CONFIG_FIELD_MISSING,
      message: `Required configuration field '${field}' is missing`,
      context: { field },
    });
  }

  /**
   * Create a HITL user rejected error
   */
  static hitlUserRejected(toolName: string, reason?: string): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.HITL_USER_REJECTED,
      message: `User rejected tool execution: ${toolName}${reason ? ` - ${reason}` : ""}`,
      toolName,
      context: { reason },
    });
  }

  /**
   * Create a HITL timeout error
   */
  static hitlTimeout(toolName: string, timeoutMs: number): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.HITL_TIMEOUT,
      message: `HITL confirmation timeout for tool '${toolName}' after ${timeoutMs}ms`,
      toolName,
      context: { timeoutMs },
    });
  }

  /**
   * Create a validation error
   * Use for general validation failures
   */
  static validationError(
    message: string,
    field?: string,
    value?: unknown,
  ): NeuroLinkError {
    // Use appropriate code based on the error context
    const code = ERROR_CODES.VALIDATION_INVALID_PARAMETERS;
    const fullMessage = field
      ? `Validation failed for field '${field}': ${message}`
      : message;

    return new NeuroLinkError({
      code,
      message: fullMessage,
      context: { field, value },
    });
  }

  /**
   * Create a missing required parameter error
   */
  static missingRequiredParameter(
    field: string,
    context?: Record<string, unknown>,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.VALIDATION_MISSING_REQUIRED_PARAM,
      message: `Required parameter '${field}' is missing`,
      context: { field, ...context },
    });
  }

  /**
   * Create an authentication error
   */
  static authError(
    message: string,
    code: ErrorCode = ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code,
      message,
    });
  }

  /**
   * Create a generic system error
   */
  static systemError(message: string, originalError?: Error): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.SYSTEM_INTERNAL_ERROR,
      message,
      originalError,
    });
  }
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry mechanism for retriable operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    delayMs: number;
    isRetriable?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  },
): Promise<T> {
  const { maxAttempts, delayMs, isRetriable = () => true, onRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt or if error is not retriable
      if (attempt === maxAttempts || !isRetriable(lastError)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error("Retry operation failed with no error information");
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open - operation not executed");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Error handler that decides whether to retry based on error type
 */
export function isRetriableError(error: Error): boolean {
  if (error instanceof NeuroLinkError) {
    return error.retriable;
  }

  // Check for common retriable error patterns
  const retriablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /temporary/i,
    /rate limit/i,
    /quota/i,
    /503/i, // Service unavailable
    /502/i, // Bad gateway
    /504/i, // Gateway timeout
  ];

  return retriablePatterns.some((pattern) => pattern.test(error.message));
}

/**
 * Enhanced error logger that provides structured logging
 */
export function logStructuredError(
  error: NeuroLinkError,
  context?: Record<string, unknown>,
): void {
  const logData = {
    ...error.toJSON(),
    ...context,
  };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(`[CRITICAL] ${error.message}`, logData);
      break;
    case ErrorSeverity.HIGH:
      logger.error(`[HIGH] ${error.message}`, logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(`[MEDIUM] ${error.message}`, logData);
      break;
    case ErrorSeverity.LOW:
      logger.info(`[LOW] ${error.message}`, logData);
      break;
  }
}
