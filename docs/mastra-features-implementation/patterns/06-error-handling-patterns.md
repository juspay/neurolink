# Error Handling Patterns in NeuroLink

This document provides a comprehensive analysis of error handling patterns used throughout the NeuroLink SDK, including error hierarchies, factory patterns, recovery mechanisms, and best practices for implementation.

## Table of Contents

1. [Error Hierarchy Overview](#error-hierarchy-overview)
2. [Error Classes and Types](#error-classes-and-types)
3. [ErrorFactory Pattern](#errorfactory-pattern)
4. [Error Codes System](#error-codes-system)
5. [Async Error Handling](#async-error-handling)
6. [Provider-Specific Errors](#provider-specific-errors)
7. [Validation Errors](#validation-errors)
8. [User-Facing Error Messages](#user-facing-error-messages)
9. [Logging Patterns](#logging-patterns)
10. [Recovery Patterns](#recovery-patterns)
11. [Template for New Error Types](#template-for-new-error-types)
12. [Best Practices](#best-practices)

---

## Error Hierarchy Overview

NeuroLink implements a structured error hierarchy with multiple levels of specialization:

```
Error (JavaScript built-in)
├── BaseError (SDK base class)
│   ├── ProviderError (provider-related errors)
│   │   ├── AuthenticationError
│   │   ├── AuthorizationError
│   │   ├── NetworkError
│   │   ├── RateLimitError
│   │   └── InvalidModelError
│   └── NeuroLinkError (enhanced structured error)
│
├── Domain-Specific Errors
│   ├── ValidationError (parameter validation)
│   ├── TimeoutError (operation timeouts)
│   ├── SageMakerError (AWS SageMaker specific)
│   ├── HITLError (Human-in-the-Loop)
│   │   ├── HITLUserRejectedError
│   │   ├── HITLTimeoutError
│   │   └── HITLConfigurationError
│   └── VideoError (video generation)
│
└── Retry/Network Errors
    ├── NetworkError (from retryHandler)
    └── TemporaryError
```

### Design Principles

1. **Inheritance-based hierarchy**: Domain errors extend base classes for consistent handling
2. **Provider isolation**: Each provider can have its own error types
3. **Structured metadata**: Errors carry rich context for debugging
4. **Retriability indicators**: Errors explicitly declare if they're retriable

---

## Error Classes and Types

### BaseError Class

Location: `/src/lib/types/errors.ts`

The foundational error class for all NeuroLink-specific errors:

```typescript
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name; // Auto-sets error name
  }
}
```

**Purpose**: Enables easy identification of errors thrown by the SDK vs. external errors.

### ProviderError Class

Provider-specific errors with optional provider context:

```typescript
export class ProviderError extends BaseError {
  constructor(
    message: string,
    public provider?: string,
  ) {
    super(provider ? `[${provider}] ${message}` : message);
  }
}
```

**Subclasses**:

- `AuthenticationError` - Invalid or missing API keys
- `AuthorizationError` - Permission denied errors
- `NetworkError` - Connectivity issues
- `RateLimitError` - API quota exceeded
- `InvalidModelError` - Model not found or invalid

### NeuroLinkError Class

Location: `/src/lib/utils/errorHandling.ts`

The enhanced structured error class with comprehensive metadata:

```typescript
export class NeuroLinkError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retriable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly toolName?: string;
  public readonly serverId?: string;

  constructor(options: {
    code: string;
    message: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    retriable: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
    toolName?: string;
    serverId?: string;
  }) {
    super(options.message);
    this.name = "NeuroLinkError";
    // ... property assignments

    // Preserve original error stack if provided
    if (options.originalError) {
      this.stack = options.originalError.stack;
      this.context.originalMessage = options.originalError.message;
    }
  }

  toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retriable: this.retriable,
      context: this.context,
      timestamp: this.timestamp,
      toolName: this.toolName,
      serverId: this.serverId,
    };
  }
}
```

### Error Categories

```typescript
export enum ErrorCategory {
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  NETWORK = "network",
  RESOURCE = "resource",
  PERMISSION = "permission",
  CONFIGURATION = "configuration",
  EXECUTION = "execution",
  SYSTEM = "system",
}
```

### Error Severity Levels

```typescript
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
```

### ValidationError Class

Location: `/src/lib/utils/parameterValidation.ts`

Specialized error for validation failures with field context:

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
```

### TimeoutError Class

Location: `/src/lib/utils/timeout.ts`

Operation timeout error with full context:

```typescript
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly provider?: string,
    public readonly operation?: "generate" | "stream",
  ) {
    super(message);
    this.name = "TimeoutError";
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}
```

---

## ErrorFactory Pattern

Location: `/src/lib/utils/errorHandling.ts`

The `ErrorFactory` class provides static methods for creating standardized errors. This pattern ensures:

- Consistent error structure across the codebase
- Rich context information
- Proper categorization and severity assignment

### Factory Methods

#### Tool Errors

```typescript
class ErrorFactory {
  // Tool not found
  static toolNotFound(
    toolName: string,
    availableTools?: string[],
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_NOT_FOUND,
      message: `Tool '${toolName}' not found`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { toolName, availableTools },
      toolName,
    });
  }

  // Tool execution failed
  static toolExecutionFailed(
    toolName: string,
    originalError: Error,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_EXECUTION_FAILED,
      message: `Tool '${toolName}' execution failed: ${originalError.message}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError,
      toolName,
      serverId,
    });
  }

  // Tool timeout
  static toolTimeout(
    toolName: string,
    timeoutMs: number,
    serverId?: string,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_TIMEOUT,
      message: `Tool '${toolName}' timed out after ${timeoutMs}ms`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { timeoutMs },
      toolName,
      serverId,
    });
  }
}
```

#### Configuration Errors

```typescript
static missingConfiguration(
  configName: string,
  context?: Record<string, unknown>,
): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.MISSING_CONFIGURATION,
    message: `Missing required configuration: ${configName}`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: context || {},
  });
}

static invalidConfiguration(
  configName: string,
  reason: string,
  context?: Record<string, unknown>,
): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.INVALID_CONFIGURATION,
    message: `Invalid configuration for '${configName}': ${reason}`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retriable: false,
    context: context || {},
  });
}
```

#### Video Validation Errors

```typescript
static invalidVideoResolution(resolution: string): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.INVALID_VIDEO_RESOLUTION,
    message: `Invalid resolution '${resolution}'. Use '720p' or '1080p'`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    retriable: false,
    context: {
      field: "output.video.resolution",
      providedValue: resolution,
      suggestions: ["Use '720p' for standard HD", "Use '1080p' for full HD"],
    },
  });
}
```

#### Rate Limiter Errors

```typescript
static rateLimiterQueueFull(maxQueueSize: number): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.RATE_LIMITER_QUEUE_FULL,
    message: `Rate limiter queue full: too many pending requests (${maxQueueSize} max)`,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.HIGH,
    retriable: true,
    context: { maxQueueSize },
  });
}
```

### Usage Pattern

```typescript
// Creating errors with ErrorFactory
import { ErrorFactory } from "../utils/errorHandling.js";

// Tool not found
throw ErrorFactory.toolNotFound("myTool", ["existingTool1", "existingTool2"]);

// Configuration missing
throw ErrorFactory.missingConfiguration("OPENAI_API_KEY");

// Video validation
throw ErrorFactory.invalidVideoResolution("4K");
```

---

## Error Codes System

Location: `/src/lib/utils/errorHandling.ts`

Centralized error codes for programmatic error handling:

```typescript
export const ERROR_CODES = {
  // Tool errors
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_TIMEOUT: "TOOL_TIMEOUT",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",

  // Parameter errors
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  MISSING_REQUIRED_PARAM: "MISSING_REQUIRED_PARAM",

  // System errors
  MEMORY_EXHAUSTED: "MEMORY_EXHAUSTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",

  // Provider errors
  PROVIDER_NOT_AVAILABLE: "PROVIDER_NOT_AVAILABLE",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_QUOTA_EXCEEDED: "PROVIDER_QUOTA_EXCEEDED",

  // Configuration errors
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  MISSING_CONFIGURATION: "MISSING_CONFIGURATION",

  // Video validation errors
  INVALID_VIDEO_RESOLUTION: "INVALID_VIDEO_RESOLUTION",
  INVALID_VIDEO_LENGTH: "INVALID_VIDEO_LENGTH",
  INVALID_VIDEO_ASPECT_RATIO: "INVALID_VIDEO_ASPECT_RATIO",
  // ... more codes

  // Rate limiter errors
  RATE_LIMITER_QUEUE_FULL: "RATE_LIMITER_QUEUE_FULL",
  RATE_LIMITER_QUEUE_TIMEOUT: "RATE_LIMITER_QUEUE_TIMEOUT",
  RATE_LIMITER_RESET: "RATE_LIMITER_RESET",

  // PPT validation errors
  MISSING_PPT_PROPERTIES: "MISSING_PPT_PROPERTIES",
  INVALID_PPT_PAGES: "INVALID_PPT_PAGES",
  // ... more codes
} as const;
```

### Error Code Handling Pattern

```typescript
try {
  await executeOperation();
} catch (error) {
  if (error instanceof NeuroLinkError) {
    switch (error.code) {
      case ERROR_CODES.TOOL_NOT_FOUND:
        // Handle tool not found
        break;
      case ERROR_CODES.RATE_LIMITER_QUEUE_FULL:
        // Implement backpressure
        break;
      case ERROR_CODES.NETWORK_ERROR:
        // Retry with backoff
        break;
    }
  }
}
```

---

## Async Error Handling

### withTimeout Pattern

Location: `/src/lib/utils/errorHandling.ts`

Wraps promises with timeout protection:

```typescript
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
```

### withRetry Pattern

Location: `/src/lib/utils/errorHandling.ts`

Implements retry logic with configurable conditions:

```typescript
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

      if (attempt === maxAttempts || !isRetriable(lastError)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
```

### withTimeoutAndRetry Pattern

Location: `/src/lib/utils/retryHandler.ts`

Combines timeout and retry logic:

```typescript
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {},
): Promise<T> {
  return withRetry(async () => {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new NetworkError(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }, retryOptions);
}
```

### Exponential Backoff

```typescript
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number = 1000,
  multiplier: number = 2,
  maxDelay: number = 30000,
  addJitter: boolean = true,
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to avoid thundering herd (up to 10% of delay, max 1 second)
  const jitter = addJitter
    ? Math.random() * Math.min(cappedDelay * 0.1, 1000)
    : 0;

  return cappedDelay + jitter;
}
```

### Retriable Error Detection

```typescript
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
```

---

## Provider-Specific Errors

### SageMaker Error System

Location: `/src/lib/providers/sagemaker/errors.ts`

Complete provider-specific error handling:

```typescript
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
    // ... property assignments
  }

  getUserFriendlyMessage(): string {
    return getSageMakerErrorGuidance(this.code, this.message, this.endpoint);
  }

  isRetryable(): boolean {
    return this.retryable;
  }

  getRetryDelay(): number {
    return RETRY_DELAYS[this.code] || RETRY_DELAYS.DEFAULT;
  }
}
```

### Error Mapping Function

```typescript
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
      ERROR_KEYWORDS.VALIDATION.some((k) => errorMessage.includes(k))
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

    // ... handle other error types
  }

  // Handle non-Error objects
  const errorMessage = typeof error === "string" ? error : "Unknown error";
  return new SageMakerError(errorMessage, {
    code: "UNKNOWN_ERROR",
    statusCode: 500,
    retryable: false,
  });
}
```

### Error Constants Pattern

Location: `/src/lib/providers/sagemaker/error-constants.ts`

```typescript
export const ERROR_MESSAGE_PREFIXES = {
  VALIDATION: "Invalid request parameters",
  MODEL: "Model execution error",
  INTERNAL: "Internal server error",
  SERVICE_UNAVAILABLE: "SageMaker service is temporarily unavailable",
  THROTTLING: "Request rate limit exceeded",
  CREDENTIALS: "AWS credentials are invalid or missing",
  NETWORK: "Network error while connecting to SageMaker",
  // ... more prefixes
} as const;

export const ERROR_MESSAGE_TEMPLATES = {
  VALIDATION_ERROR: `...multi-line template with troubleshooting steps...`,
  CREDENTIALS_ERROR: `...template with setup instructions...`,
  // ... more templates
} as const;

export const RETRY_DELAYS = {
  THROTTLING_ERROR: 5000,
  SERVICE_UNAVAILABLE: 2000,
  NETWORK_ERROR: 1000,
  DEFAULT: 1000,
} as const;

export const ERROR_KEYWORDS = {
  VALIDATION: ["validation"],
  MODEL: ["model error"],
  INTERNAL: ["internal"],
  SERVICE_UNAVAILABLE: ["unavailable"],
  THROTTLING: ["throttl"],
  // ... more keywords
} as const;
```

---

## Validation Errors

### Parameter Validation Pattern

Location: `/src/lib/utils/parameterValidation.ts`

```typescript
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  minLength = 1,
): ValidationError | null {
  if (value === undefined || value === null) {
    return new ValidationError(
      `${fieldName} is required`,
      fieldName,
      "REQUIRED_FIELD",
      [`Provide a valid ${fieldName.toLowerCase()}`],
    );
  }

  if (typeof value !== "string") {
    return new ValidationError(
      `${fieldName} must be a string, received ${typeof value}`,
      fieldName,
      "INVALID_TYPE",
      [`Convert ${fieldName.toLowerCase()} to string format`],
    );
  }

  if (value.trim().length < minLength) {
    return new ValidationError(
      `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""} long`,
      fieldName,
      "MIN_LENGTH",
      [`Provide a meaningful ${fieldName.toLowerCase()}`],
    );
  }

  return null;
}
```

### Enhanced Validation Result

```typescript
export type EnhancedValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
};
```

### Complex Validation Example

```typescript
export function validateVideoGenerationInput(
  options: GenerateOptions,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Must have video mode
  if (options.output?.mode !== "video") {
    errors.push(toValidationError(ErrorFactory.invalidVideoMode()));
  }

  // Must have at least one image
  if (!options.input?.images || options.input.images.length === 0) {
    errors.push(toValidationError(ErrorFactory.missingVideoImage()));
  } else if (options.input.images.length > 1) {
    warnings.push(
      "Only the first image will be used. Additional images ignored.",
    );
    suggestions.push("Provide a single image for video generation");
  }

  // Validate prompt
  const trimmedPrompt = options.input?.text?.trim() || "";
  if (trimmedPrompt.length === 0) {
    errors.push(toValidationError(ErrorFactory.emptyVideoPrompt()));
  } else if (trimmedPrompt.length > MAX_VIDEO_PROMPT_LENGTH) {
    errors.push(
      toValidationError(
        ErrorFactory.videoPromptTooLong(
          trimmedPrompt.length,
          MAX_VIDEO_PROMPT_LENGTH,
        ),
      ),
    );
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}
```

---

## User-Facing Error Messages

### CLI Error Handler

Location: `/src/cli/errorHandler.ts`

```typescript
export function handleError(_error: Error, context: string): void {
  logger.error(chalk.red(`X ${context} failed: ${_error.message}`));

  if (_error instanceof AuthenticationError) {
    logger.error(
      chalk.yellow(
        "Tip: Set Google AI Studio API key: export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    logger.error(
      chalk.yellow("Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    // ... more helpful tips
  } else if (_error instanceof RateLimitError) {
    logger.error(
      chalk.yellow("Tip: Try again in a few moments or use --provider vertex"),
    );
  } else if (_error instanceof AuthorizationError) {
    logger.error(
      chalk.yellow(
        "Tip: Check your account permissions for the selected model/service.",
      ),
    );
  } else if (_error instanceof NetworkError) {
    logger.error(
      chalk.yellow(
        "Tip: Check your internet connection and the provider's status page.",
      ),
    );
  }

  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
}
```

### User-Friendly Message Guidelines

1. **Include actionable suggestions**:

   ```typescript
   context: {
     field: "output.video.resolution",
     providedValue: resolution,
     suggestions: ["Use '720p' for standard HD", "Use '1080p' for full HD"],
   }
   ```

2. **Provide troubleshooting steps**:

   ```typescript
   const template = `
   X SageMaker Request Validation Error{endpointContext}
   
   {originalMessage}
   
   Common Solutions:
   1. Check your request parameters and format
   2. Verify the endpoint name is correct
   3. Ensure your request body matches expected format
   
   Tips:
   - Double-check endpoint name spelling
   - Ensure JSON format is valid
   `;
   ```

3. **Include relevant context**:
   ```typescript
   return new NeuroLinkError({
     code: ERROR_CODES.INVALID_VIDEO_LENGTH,
     message: `Invalid length '${length}'. Use 4, 6, or 8 seconds`,
     context: {
       field: "output.video.length",
       providedValue: length,
       suggestions: [
         "Use 4 for short clips",
         "Use 6 for balanced duration (recommended)",
         "Use 8 for longer videos",
       ],
     },
   });
   ```

---

## Logging Patterns

### Logger Architecture

Location: `/src/lib/utils/logger.ts`

```typescript
class NeuroLinkLogger {
  private logLevel: LogLevel = "info";
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  shouldLog(level: LogLevel): boolean {
    const currentDebugMode =
      process.argv.includes("--debug") ||
      process.env.NEUROLINK_DEBUG === "true";

    // Hide all logs except errors unless debugging
    if (!currentDebugMode && level !== "error") {
      return false;
    }

    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    // Emit log event if emitter is configured
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emit("log-event", {
          level,
          message,
          timestamp,
          data,
        });
      } catch {
        // Silently ignore emitter errors
      }
    }

    // Store and manage log history
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console
    const prefix = `[${timestamp}] [NEUROLINK:${level.toUpperCase()}]`;
    const logMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[level];
    logMethod(prefix, message, data);
  }
}
```

### Structured Error Logging

```typescript
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
```

### Error Logging Patterns in Providers

```typescript
// In BaseProvider.generate()
try {
  // ... generation logic
} catch (error) {
  logger.error(`Generate failed for ${this.providerName}:`, error);
  throw this.handleProviderError(error);
}

// Graceful degradation with logging
try {
  const analytics = await this.createAnalytics(result, responseTime, options);
  enhancedResult = { ...enhancedResult, analytics };
} catch (error) {
  logger.warn(`Analytics creation failed for ${this.providerName}:`, error);
  // Continue without analytics
}
```

---

## Recovery Patterns

### Circuit Breaker Pattern

Location: `/src/lib/mcp/mcpCircuitBreaker.ts`

```typescript
export class MCPCircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = "closed";
  private callHistory: CallRecord[] = [];
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
        throw new Error(
          `Circuit breaker '${this.name}' is open. Next retry at ${nextRetryTime}`,
        );
      }
      // Transition to half-open
      this.changeState("half-open", "Reset timeout reached");
    }

    // Check half-open call limit
    if (
      this.state === "half-open" &&
      this.halfOpenCalls >= this.config.halfOpenMaxCalls
    ) {
      throw new Error(
        `Circuit breaker '${this.name}' is half-open but limit reached`,
      );
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise(this.config.operationTimeout),
      ]);

      this.recordCall(true, duration);

      // Handle half-open success
      if (this.state === "half-open") {
        this.halfOpenCalls++;
        if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          this.changeState("closed", "Half-open test successful");
        }
      }

      return result;
    } catch (error) {
      this.recordCall(false, duration);

      if (this.state === "half-open") {
        this.changeState("open", `Half-open test failed: ${error.message}`);
      } else if (this.state === "closed") {
        this.checkFailureThreshold();
      }

      throw error;
    }
  }
}
```

### Graceful Shutdown

Location: `/src/lib/utils/retryHandler.ts`

```typescript
export class GracefulShutdown {
  private operations: Set<Promise<unknown>> = new Set();

  track<T>(operation: Promise<T>): Promise<T> {
    this.operations.add(operation);
    operation.finally(() => {
      this.operations.delete(operation);
    });
    return operation;
  }

  async shutdown(timeoutMs = 30000): Promise<void> {
    logger.debug(
      `Graceful shutdown: waiting for ${this.operations.size} operations...`,
    );

    try {
      await Promise.race([
        Promise.all(this.operations),
        sleep(timeoutMs).then(() => {
          throw new Error(
            `Shutdown timeout: ${this.operations.size} operations still running`,
          );
        }),
      ]);
      logger.debug("Graceful shutdown completed");
    } catch (error) {
      logger.warn(`Shutdown warning: ${error.message}`);
    }
  }
}
```

### Fallback Streaming

```typescript
// In BaseProvider.stream()
try {
  const realStreamResult = await this.executeStream(options, analysisSchema);
  return realStreamResult;
} catch (realStreamError) {
  logger.warn(
    `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
    { error: realStreamError.message },
  );

  // Fallback to fake streaming if tools are enabled
  if (!options.disableTools && this.supportsTools()) {
    return await this.executeFakeStreaming(options, analysisSchema);
  } else {
    throw this.handleProviderError(realStreamError);
  }
}
```

---

## Template for New Error Types

### Step 1: Define Error Code

```typescript
// In src/lib/utils/errorHandling.ts
export const ERROR_CODES = {
  // ... existing codes

  // Add new category
  MY_FEATURE_INVALID_INPUT: "MY_FEATURE_INVALID_INPUT",
  MY_FEATURE_TIMEOUT: "MY_FEATURE_TIMEOUT",
  MY_FEATURE_RESOURCE_EXHAUSTED: "MY_FEATURE_RESOURCE_EXHAUSTED",
} as const;
```

### Step 2: Create Error Factory Method

```typescript
// In ErrorFactory class
static myFeatureInvalidInput(
  field: string,
  providedValue: unknown,
  allowedValues?: string[],
): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.MY_FEATURE_INVALID_INPUT,
    message: `Invalid ${field} value: '${providedValue}'`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    retriable: false,
    context: {
      field,
      providedValue,
      allowedValues,
      suggestions: allowedValues
        ? allowedValues.map(v => `Use '${v}'`)
        : [`Check documentation for valid ${field} values`],
    },
  });
}

static myFeatureTimeout(
  operationName: string,
  timeoutMs: number,
): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.MY_FEATURE_TIMEOUT,
    message: `${operationName} timed out after ${timeoutMs}ms`,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.HIGH,
    retriable: true,
    context: {
      operationName,
      timeoutMs,
      suggestions: [
        "Increase timeout value",
        "Check network connectivity",
        "Verify service availability",
      ],
    },
  });
}
```

### Step 3: Create Domain-Specific Error Class (Optional)

```typescript
// In src/lib/myFeature/errors.ts
export class MyFeatureError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode?: number;
      cause?: Error;
      retryable?: boolean;
      context?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "MyFeatureError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
    this.retryable = options.retryable ?? false;
    this.context = options.context ?? {};

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MyFeatureError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }

  getUserFriendlyMessage(): string {
    // Return formatted message with suggestions
    return getMyFeatureErrorGuidance(this.code, this.message);
  }
}

// Error constants
export const MY_FEATURE_ERROR_CODES = {
  INVALID_INPUT: "MY_FEATURE_INVALID_INPUT",
  TIMEOUT: "MY_FEATURE_TIMEOUT",
  RESOURCE_EXHAUSTED: "MY_FEATURE_RESOURCE_EXHAUSTED",
} as const;

export type MyFeatureErrorCode =
  (typeof MY_FEATURE_ERROR_CODES)[keyof typeof MY_FEATURE_ERROR_CODES];
```

### Step 4: Create Validation Functions

```typescript
// In src/lib/utils/parameterValidation.ts
export function validateMyFeatureOptions(
  options: MyFeatureOptions,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate required fields
  const inputError = validateRequiredString(options.input, "input", 1);
  if (inputError) {
    errors.push(inputError);
  }

  // Validate numeric ranges
  const limitError = validateNumberRange(options.limit, "limit", 1, 100);
  if (limitError) {
    errors.push(limitError);
  }

  // Add helpful suggestions
  if (errors.length === 0) {
    suggestions.push("Consider enabling caching for better performance");
  }

  return { isValid: errors.length === 0, errors, warnings, suggestions };
}
```

### Step 5: Usage Pattern

```typescript
// In your feature implementation
import { ErrorFactory } from "../utils/errorHandling.js";
import { validateMyFeatureOptions } from "../utils/parameterValidation.js";

async function executeMyFeature(options: MyFeatureOptions): Promise<Result> {
  // Validate input
  const validation = validateMyFeatureOptions(options);
  if (!validation.isValid) {
    throw ErrorFactory.invalidParameters(
      "my-feature",
      new Error(validation.errors.map((e) => e.message).join("; ")),
      { errors: validation.errors },
    );
  }

  try {
    // Execute with timeout protection
    return await withTimeout(
      performOperation(options),
      options.timeout || 30000,
      ErrorFactory.myFeatureTimeout(
        "performOperation",
        options.timeout || 30000,
      ),
    );
  } catch (error) {
    if (error instanceof MyFeatureError) {
      throw error; // Already wrapped
    }

    // Wrap unknown errors
    throw ErrorFactory.toolExecutionFailed("my-feature", error as Error);
  }
}
```

---

## Best Practices

### 1. Always Use ErrorFactory for Consistency

```typescript
// Good
throw ErrorFactory.toolNotFound(toolName, availableTools);

// Avoid
throw new Error(`Tool ${toolName} not found`);
```

### 2. Include Rich Context

```typescript
// Good
throw new NeuroLinkError({
  code: ERROR_CODES.INVALID_PARAMETERS,
  message: "Invalid temperature value",
  context: {
    field: "temperature",
    providedValue: value,
    minValue: 0,
    maxValue: 2,
    suggestions: ["Use a value between 0 and 2"],
  },
});

// Avoid
throw new Error("Invalid temperature");
```

### 3. Mark Retriability Correctly

```typescript
// Network errors are usually retriable
retriable: true;

// Validation errors are not retriable
retriable: false;

// Check error type
if (error instanceof NeuroLinkError && error.retriable) {
  // Implement retry logic
}
```

### 4. Preserve Original Errors

```typescript
// Good - preserves stack trace and original message
return new NeuroLinkError({
  code: ERROR_CODES.TOOL_EXECUTION_FAILED,
  message: `Tool failed: ${originalError.message}`,
  originalError,
});

// Avoid - loses context
throw new Error(originalError.message);
```

### 5. Use Appropriate Severity

```typescript
// CRITICAL - System-wide impact
ErrorSeverity.CRITICAL; // Memory exhaustion, data corruption

// HIGH - Affects current operation significantly
ErrorSeverity.HIGH; // Timeouts, auth failures, execution failures

// MEDIUM - Recoverable issues
ErrorSeverity.MEDIUM; // Validation errors, missing optional config

// LOW - Minor issues
ErrorSeverity.LOW; // Deprecation warnings, performance hints
```

### 6. Log Before Throwing

```typescript
try {
  await operation();
} catch (error) {
  logger.error(`Operation failed:`, {
    error: error instanceof Error ? error.message : String(error),
    context: {
      /* relevant context */
    },
  });
  throw this.handleProviderError(error);
}
```

### 7. Implement Graceful Degradation

```typescript
// Continue without optional features on error
try {
  const analytics = await this.createAnalytics(result, responseTime);
  enhancedResult.analytics = analytics;
} catch (error) {
  logger.warn(`Analytics failed, continuing without:`, error);
  // Result still returned without analytics
}
```

### 8. Use Type Guards for Error Handling

```typescript
function isNeuroLinkError(error: unknown): error is NeuroLinkError {
  return error instanceof NeuroLinkError;
}

function isSageMakerError(error: unknown): error is SageMakerError {
  return error instanceof SageMakerError;
}

// Usage
if (isNeuroLinkError(error)) {
  handleNeuroLinkError(error);
} else if (isSageMakerError(error)) {
  handleSageMakerError(error);
} else {
  handleGenericError(error);
}
```

### 9. Export Error Types for Consumers

```typescript
// In src/lib/index.ts or module exports
export {
  BaseError,
  ProviderError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  InvalidModelError,
} from "./types/errors.js";

export {
  NeuroLinkError,
  ErrorFactory,
  ERROR_CODES,
} from "./utils/errorHandling.js";

export { ValidationError } from "./utils/parameterValidation.js";

export { TimeoutError } from "./utils/timeout.js";
```

### 10. Document Error Scenarios

```typescript
/**
 * Generate video from image + prompt using Veo 3.1
 *
 * @throws {NeuroLinkError} INVALID_VIDEO_RESOLUTION - Invalid resolution value
 * @throws {NeuroLinkError} INVALID_VIDEO_LENGTH - Invalid length value
 * @throws {NeuroLinkError} MISSING_VIDEO_IMAGE - No input image provided
 * @throws {VideoError} GENERATION_FAILED - Video generation API failed
 */
async function generateVideo(options: VideoOptions): Promise<VideoResult> {
  // ...
}
```

---

## Summary

NeuroLink's error handling system provides:

1. **Structured Error Hierarchy** - Multiple layers of specialization from base to domain-specific
2. **ErrorFactory Pattern** - Consistent error creation with rich context
3. **Comprehensive Error Codes** - Programmatic error handling support
4. **Retry/Recovery Patterns** - Circuit breaker, exponential backoff, graceful degradation
5. **User-Friendly Messages** - Actionable suggestions and troubleshooting steps
6. **Structured Logging** - Severity-based logging with full context
7. **Provider Isolation** - Each provider can have specialized error handling

Key files to reference:

- `/src/lib/types/errors.ts` - Base error classes
- `/src/lib/utils/errorHandling.ts` - NeuroLinkError, ErrorFactory, ERROR_CODES
- `/src/lib/utils/parameterValidation.ts` - ValidationError, validation functions
- `/src/lib/utils/timeout.ts` - TimeoutError, timeout utilities
- `/src/lib/utils/retryHandler.ts` - Retry logic, CircuitBreaker, GracefulShutdown
- `/src/lib/mcp/mcpCircuitBreaker.ts` - MCP-specific circuit breaker
- `/src/lib/providers/sagemaker/errors.ts` - Provider-specific error example
- `/src/cli/errorHandler.ts` - CLI error presentation
