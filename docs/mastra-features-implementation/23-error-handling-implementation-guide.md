# Error Handling Implementation Guide

## Overview

This comprehensive guide documents NeuroLink's enterprise-grade error handling system, evolved from June 2025 to January 2026. It covers the complete error hierarchy, factory patterns, retry mechanisms, circuit breakers, rate limiting, and recovery strategies. Use this guide when implementing new features or enhancing existing error handling.

---

## Table of Contents

1. [Error Hierarchy Design](#1-error-hierarchy-design)
2. [ErrorFactory Patterns](#2-errorfactory-patterns)
3. [Retry Mechanisms](#3-retry-mechanisms)
4. [Circuit Breaker Patterns](#4-circuit-breaker-patterns)
5. [Rate Limiting](#5-rate-limiting)
6. [User-Facing Errors](#6-user-facing-errors)
7. [Error Templates](#7-error-templates)
8. [Recovery Strategies](#8-recovery-strategies)
9. [Best Practices](#9-best-practices)
10. [Quick Reference](#10-quick-reference)

---

## 1. Error Hierarchy Design

### 1.1 Complete Error Hierarchy

NeuroLink implements a structured, inheritance-based error hierarchy:

```
Error (JavaScript built-in)
|
+-- BaseError (SDK base class)
|   |
|   +-- ProviderError (provider-related errors)
|   |   +-- AuthenticationError
|   |   +-- AuthorizationError
|   |   +-- NetworkError
|   |   +-- RateLimitError
|   |   +-- InvalidModelError
|   |
|   +-- NeuroLinkError (enhanced structured error)
|
+-- Domain-Specific Errors
|   +-- ValidationError (parameter validation)
|   +-- TimeoutError (operation timeouts)
|   +-- SageMakerError (AWS SageMaker specific)
|   +-- HITLError (Human-in-the-Loop)
|   |   +-- HITLUserRejectedError
|   |   +-- HITLTimeoutError
|   |   +-- HITLConfigurationError
|   +-- VideoError (video generation)
|   +-- VideoProcessingError
|
+-- Retry/Network Errors
    +-- NetworkError (from retryHandler)
    +-- TemporaryError
```

### 1.2 Base Error Classes

#### BaseError - Foundation Class

**Location:** `/src/lib/types/errors.ts`

```typescript
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name; // Auto-sets error name
  }
}
```

**Purpose:** Enables identification of SDK-thrown errors vs. external errors.

#### ProviderError - Provider Context

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

**Subclasses:**

- `AuthenticationError` - Invalid or missing API keys
- `AuthorizationError` - Permission denied errors
- `NetworkError` - Connectivity issues
- `RateLimitError` - API quota exceeded
- `InvalidModelError` - Model not found or invalid

### 1.3 NeuroLinkError - Enhanced Structured Error

**Location:** `/src/lib/utils/errorHandling.ts`

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
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.retriable = options.retriable;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.toolName = options.toolName;
    this.serverId = options.serverId;

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

### 1.4 Error Categories

```typescript
export enum ErrorCategory {
  VALIDATION = "validation", // Input/parameter validation failures
  TIMEOUT = "timeout", // Operation timeout errors
  NETWORK = "network", // Network connectivity issues
  RESOURCE = "resource", // Resource exhaustion/limits
  PERMISSION = "permission", // Authorization/access denied
  CONFIGURATION = "configuration", // Config/setup errors
  EXECUTION = "execution", // Runtime execution failures
  SYSTEM = "system", // Internal system errors
}
```

### 1.5 Error Severity Levels

```typescript
export enum ErrorSeverity {
  LOW = "low", // Minor issues, informational
  MEDIUM = "medium", // Recoverable issues, validation errors
  HIGH = "high", // Significant failures, requires attention
  CRITICAL = "critical", // System-wide impact, immediate action needed
}
```

**Severity Assignment Guidelines:**

| Severity | Use Case                         | Example                                     |
| -------- | -------------------------------- | ------------------------------------------- |
| CRITICAL | System-wide impact               | Memory exhaustion, data corruption          |
| HIGH     | Operation significantly affected | Timeouts, auth failures, execution failures |
| MEDIUM   | Recoverable issues               | Validation errors, missing optional config  |
| LOW      | Minor issues                     | Deprecation warnings, performance hints     |

---

## 2. ErrorFactory Patterns

### 2.1 Overview

The `ErrorFactory` class provides static methods for creating standardized errors, ensuring:

- Consistent error structure across the codebase
- Rich context information for debugging
- Proper categorization and severity assignment

**Location:** `/src/lib/utils/errorHandling.ts`

### 2.2 Complete Error Codes

```typescript
export const ERROR_CODES = {
  // Tool errors
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_TIMEOUT: "TOOL_TIMEOUT",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",
  TOOL_DISCOVERY_FAILED: "TOOL_DISCOVERY_FAILED",

  // Parameter errors
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  MISSING_REQUIRED_PARAM: "MISSING_REQUIRED_PARAM",

  // Provider errors
  PROVIDER_NOT_AVAILABLE: "PROVIDER_NOT_AVAILABLE",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_QUOTA_EXCEEDED: "PROVIDER_QUOTA_EXCEEDED",
  PROVIDER_RATE_LIMIT: "PROVIDER_RATE_LIMIT",
  PROVIDER_MODEL_INVALID: "PROVIDER_MODEL_INVALID",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_CONNECTION_FAILED: "NETWORK_CONNECTION_FAILED",

  // Authentication errors
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_MISSING_CREDENTIALS: "AUTH_MISSING_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",

  // Configuration errors
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  MISSING_CONFIGURATION: "MISSING_CONFIGURATION",

  // MCP errors
  MCP_SERVER_NOT_FOUND: "MCP_SERVER_NOT_FOUND",
  MCP_SERVER_CONNECTION_FAILED: "MCP_SERVER_CONNECTION_FAILED",

  // HITL errors
  HITL_USER_REJECTED: "HITL_USER_REJECTED",
  HITL_TIMEOUT: "HITL_TIMEOUT",
  HITL_CONFIGURATION_INVALID: "HITL_CONFIGURATION_INVALID",

  // Video validation errors
  INVALID_VIDEO_RESOLUTION: "INVALID_VIDEO_RESOLUTION",
  INVALID_VIDEO_LENGTH: "INVALID_VIDEO_LENGTH",
  INVALID_VIDEO_ASPECT_RATIO: "INVALID_VIDEO_ASPECT_RATIO",
  MISSING_VIDEO_IMAGE: "MISSING_VIDEO_IMAGE",
  EMPTY_VIDEO_PROMPT: "EMPTY_VIDEO_PROMPT",
  VIDEO_PROMPT_TOO_LONG: "VIDEO_PROMPT_TOO_LONG",

  // Rate limiter errors
  RATE_LIMITER_QUEUE_FULL: "RATE_LIMITER_QUEUE_FULL",
  RATE_LIMITER_QUEUE_TIMEOUT: "RATE_LIMITER_QUEUE_TIMEOUT",
  RATE_LIMITER_RESET: "RATE_LIMITER_RESET",

  // PPT validation errors
  MISSING_PPT_PROPERTIES: "MISSING_PPT_PROPERTIES",
  INVALID_PPT_PAGES: "INVALID_PPT_PAGES",

  // System errors
  SYSTEM_INTERNAL_ERROR: "SYSTEM_INTERNAL_ERROR",
  MEMORY_EXHAUSTED: "MEMORY_EXHAUSTED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const;
```

### 2.3 Factory Method Implementations

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

  // Tool validation failed
  static toolValidationFailed(
    toolName: string,
    reason: string,
    context?: Record<string, unknown>,
  ): NeuroLinkError {
    return new NeuroLinkError({
      code: ERROR_CODES.TOOL_VALIDATION_FAILED,
      message: `Tool '${toolName}' validation failed: ${reason}`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: context || {},
      toolName,
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
    category: ErrorCategory.CONFIGURATION,
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
    category: ErrorCategory.CONFIGURATION,
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

static invalidVideoLength(length: number): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.INVALID_VIDEO_LENGTH,
    message: `Invalid length '${length}'. Use 4, 6, or 8 seconds`,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    retriable: false,
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

static rateLimiterQueueTimeout(waitTimeMs: number): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.RATE_LIMITER_QUEUE_TIMEOUT,
    message: `Rate limiter queue timeout after ${waitTimeMs}ms`,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.HIGH,
    retriable: true,
    context: { waitTimeMs },
  });
}
```

### 2.4 Usage Pattern

```typescript
// Import ErrorFactory
import { ErrorFactory } from "../utils/errorHandling.js";

// Tool not found - include available tools for suggestions
throw ErrorFactory.toolNotFound("myTool", ["existingTool1", "existingTool2"]);

// Configuration missing - clear guidance
throw ErrorFactory.missingConfiguration("OPENAI_API_KEY");

// Video validation - rich context
throw ErrorFactory.invalidVideoResolution("4K");

// Tool execution with original error preserved
try {
  await executeTool(toolName, params);
} catch (error) {
  throw ErrorFactory.toolExecutionFailed(toolName, error as Error, serverId);
}
```

---

## 3. Retry Mechanisms

### 3.1 Exponential Backoff with Jitter

**Location:** `/src/lib/utils/retryHandler.ts`

```typescript
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number = 1000,
  multiplier: number = 2,
  maxDelay: number = 30000,
  addJitter: boolean = true,
): number {
  // Calculate exponential delay: initialDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to avoid thundering herd (up to 10% of delay, max 1 second)
  const jitter = addJitter
    ? Math.random() * Math.min(cappedDelay * 0.1, 1000)
    : 0;

  return cappedDelay + jitter;
}
```

**Example backoff progression (initialDelay=1000, multiplier=2):**

| Attempt | Base Delay       | With Jitter (approx) |
| ------- | ---------------- | -------------------- |
| 1       | 1000ms           | 1000-1100ms          |
| 2       | 2000ms           | 2000-2200ms          |
| 3       | 4000ms           | 4000-4400ms          |
| 4       | 8000ms           | 8000-8800ms          |
| 5       | 16000ms          | 16000-17000ms        |
| 6       | 30000ms (capped) | 30000-31000ms        |

### 3.2 withTimeout Pattern

**Location:** `/src/lib/utils/errorHandling.ts`

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

**Usage:**

```typescript
const result = await withTimeout(
  fetchData(),
  5000,
  new TimeoutError("Data fetch timed out", 5000, "myProvider", "generate"),
);
```

### 3.3 withRetry Pattern

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

      // Don't retry on last attempt or non-retriable errors
      if (attempt === maxAttempts || !isRetriable(lastError)) {
        throw lastError;
      }

      // Notify retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
```

### 3.4 withTimeoutAndRetry Combined Pattern

**Location:** `/src/lib/utils/retryHandler.ts`

```typescript
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    multiplier = 2,
    maxDelay = 30000,
    isRetriable = isRetriableError,
    onRetry,
  } = retryOptions;

  return withRetry(
    async () => {
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
    },
    {
      maxAttempts,
      delayMs: initialDelay,
      isRetriable,
      onRetry: (attempt, error) => {
        const delay = calculateBackoffDelay(
          attempt,
          initialDelay,
          multiplier,
          maxDelay,
        );
        if (onRetry) onRetry(attempt, error);
        return new Promise((resolve) => setTimeout(resolve, delay));
      },
    },
  );
}
```

### 3.5 Retriable Error Detection

```typescript
export function isRetriableError(error: Error): boolean {
  // Check NeuroLinkError retriable flag
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

// More specific HTTP-based detection
export function isRetriableHTTPError(
  error: unknown,
  config: HTTPRetryConfig = DEFAULT_HTTP_RETRY_CONFIG,
): boolean {
  const errorObj = error as Record<string, unknown>;

  // Check for timeout errors
  if (
    errorObj.name === "TimeoutError" ||
    errorObj.code === "TIMEOUT" ||
    errorObj.code === "ETIMEDOUT" ||
    errorObj.name === "AbortError"
  ) {
    return true;
  }

  // Check for network-related errors
  const networkErrorCodes = [
    "ECONNRESET",
    "ENOTFOUND",
    "ECONNREFUSED",
    "ECONNABORTED",
    "EPIPE",
    "ENETUNREACH",
    "EHOSTUNREACH",
  ];
  if (networkErrorCodes.includes(errorObj.code as string)) {
    return true;
  }

  // Check for HTTP status codes
  if (typeof errorObj.status === "number") {
    const retryableStatusCodes = config.retryableStatusCodes || [
      408, 429, 500, 502, 503, 504,
    ];
    return retryableStatusCodes.includes(errorObj.status);
  }

  return false;
}
```

### 3.6 HTTP Retry Configuration

**Location:** `/src/lib/mcp/httpRetryHandler.ts`

```typescript
export type HTTPRetryConfig = {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
};

export const DEFAULT_HTTP_RETRY_CONFIG: HTTPRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
```

---

## 4. Circuit Breaker Patterns

### 4.1 Three-State Circuit Breaker

**Location:** `/src/lib/mcp/mcpCircuitBreaker.ts`

The circuit breaker pattern prevents cascading failures by "opening" the circuit when failures exceed a threshold.

**States:**

1. **Closed** - Normal operation, requests flow through
2. **Open** - Failures exceeded threshold, requests rejected immediately
3. **Half-Open** - Testing if service recovered, limited requests allowed

```typescript
export type CircuitBreakerConfig = {
  failureThreshold: number; // Failures to trigger open state (default: 5)
  resetTimeout: number; // Time in open state before half-open (default: 60000ms)
  monitorWindow: number; // Time window for counting failures (default: 600000ms)
  halfOpenMaxCalls: number; // Calls allowed in half-open state (default: 3)
  operationTimeout: number; // Timeout per operation (default: 30000ms)
};

export class MCPCircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = "closed";
  private callHistory: CallRecord[] = [];
  private lastFailureTime = 0;
  private halfOpenCalls = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig = DEFAULT_CONFIG,
  ) {
    super();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
        const nextRetryTime = new Date(
          this.lastFailureTime + this.config.resetTimeout,
        );
        throw new Error(
          `Circuit breaker '${this.name}' is open. Next retry at ${nextRetryTime.toISOString()}`,
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
        `Circuit breaker '${this.name}' is half-open but maximum test calls reached`,
      );
    }

    const startTime = Date.now();
    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise(this.config.operationTimeout),
      ]);

      const duration = Date.now() - startTime;
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
      const duration = Date.now() - startTime;
      this.recordCall(false, duration);
      this.lastFailureTime = Date.now();

      if (this.state === "half-open") {
        this.changeState(
          "open",
          `Half-open test failed: ${(error as Error).message}`,
        );
      } else if (this.state === "closed") {
        this.checkFailureThreshold();
      }

      throw error;
    }
  }

  private checkFailureThreshold(): void {
    const windowStart = Date.now() - this.config.monitorWindow;
    const recentFailures = this.callHistory.filter(
      (record) => !record.success && record.timestamp > windowStart,
    );

    if (recentFailures.length >= this.config.failureThreshold) {
      this.changeState(
        "open",
        `Failure threshold exceeded (${recentFailures.length})`,
      );
    }
  }

  private changeState(newState: CircuitBreakerState, reason: string): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === "closed") {
      this.halfOpenCalls = 0;
    }

    this.emit("stateChange", { oldState, newState, reason });
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms,
      );
    });
  }

  private recordCall(success: boolean, duration: number): void {
    this.callHistory.push({
      timestamp: Date.now(),
      success,
      duration,
    });

    // Trim old records
    const windowStart = Date.now() - this.config.monitorWindow;
    this.callHistory = this.callHistory.filter(
      (r) => r.timestamp > windowStart,
    );
  }

  // Getter methods
  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    const windowStart = Date.now() - this.config.monitorWindow;
    const recentCalls = this.callHistory.filter(
      (r) => r.timestamp > windowStart,
    );
    const failures = recentCalls.filter((r) => !r.success).length;
    const successes = recentCalls.filter((r) => r.success).length;

    return {
      state: this.state,
      totalCalls: recentCalls.length,
      failures,
      successes,
      failureRate: recentCalls.length > 0 ? failures / recentCalls.length : 0,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
```

### 4.2 Circuit Breaker Usage

```typescript
// Create circuit breaker for an MCP server
const circuitBreaker = new MCPCircuitBreaker("github-mcp", {
  failureThreshold: 5,
  resetTimeout: 60000,
  monitorWindow: 300000,
  halfOpenMaxCalls: 3,
  operationTimeout: 30000,
});

// Listen for state changes
circuitBreaker.on("stateChange", ({ oldState, newState, reason }) => {
  logger.warn(
    `Circuit breaker changed: ${oldState} -> ${newState}. Reason: ${reason}`,
  );
});

// Execute operations through circuit breaker
try {
  const result = await circuitBreaker.execute(async () => {
    return await mcpClient.callTool(toolName, params);
  });
} catch (error) {
  if (error.message.includes("Circuit breaker")) {
    // Handle circuit open - maybe use fallback
    logger.error("Service unavailable, circuit breaker open");
  }
}
```

### 4.3 Simple Circuit Breaker (Legacy)

**Location:** `/src/lib/utils/retryHandler.ts`

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private monitorWindow = 600000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open - operation rejected");
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
    if (this.state === "half-open") {
      this.state = "closed";
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

---

## 5. Rate Limiting

### 5.1 Token Bucket Algorithm

**Location:** `/src/lib/mcp/httpRateLimiter.ts`

The token bucket algorithm allows bursts while maintaining average rate limits.

```typescript
export type RateLimitConfig = {
  tokensPerSecond: number; // Rate of token replenishment
  bucketSize: number; // Maximum tokens (burst capacity)
  maxQueueSize: number; // Maximum waiting requests
  queueTimeout: number; // How long to wait for a token
};

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  tokensPerSecond: 10,
  bucketSize: 20,
  maxQueueSize: 100,
  queueTimeout: 30000,
};

export class HTTPRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private processingQueue = false;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.tokens = this.config.bucketSize;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tryAcquire()) {
      return;
    }

    // Check queue size
    if (this.waitQueue.length >= this.config.maxQueueSize) {
      throw ErrorFactory.rateLimiterQueueFull(this.config.maxQueueSize);
    }

    // Add to wait queue
    return new Promise<void>((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        timestamp: Date.now(),
      };
      this.waitQueue.push(entry);

      // Start queue processing if not already running
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  private tryAcquire(): boolean {
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.config.tokensPerSecond;

    this.tokens = Math.min(this.tokens + tokensToAdd, this.config.bucketSize);
    this.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.waitQueue.length > 0) {
      this.refillTokens();

      // Check for timed out entries
      const now = Date.now();
      const timedOut = this.waitQueue.filter(
        (entry) => now - entry.timestamp > this.config.queueTimeout,
      );

      for (const entry of timedOut) {
        entry.reject(
          ErrorFactory.rateLimiterQueueTimeout(this.config.queueTimeout),
        );
        this.waitQueue = this.waitQueue.filter((e) => e !== entry);
      }

      // Process available tokens
      while (this.tokens >= 1 && this.waitQueue.length > 0) {
        const entry = this.waitQueue.shift();
        if (entry) {
          this.tokens -= 1;
          entry.resolve();
        }
      }

      // Wait for more tokens if queue still has entries
      if (this.waitQueue.length > 0) {
        await this.sleep(100); // Check every 100ms
      }
    }

    this.processingQueue = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Handle rate limit response headers
  handleRateLimitResponse(headers: Headers): number {
    // Parse Retry-After header
    const retryAfter = headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
      // Try parsing as HTTP date
      const date = Date.parse(retryAfter);
      if (!isNaN(date)) {
        return Math.max(0, date - Date.now());
      }
    }

    // Check for X-RateLimit-Reset header (Unix timestamp)
    const rateLimitReset = headers.get("X-RateLimit-Reset");
    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset, 10) * 1000;
      return Math.max(0, resetTime - Date.now());
    }

    // Default backoff
    return 1000;
  }

  // Get current state
  getStats(): { tokens: number; queueSize: number; config: RateLimitConfig } {
    this.refillTokens();
    return {
      tokens: this.tokens,
      queueSize: this.waitQueue.length,
      config: this.config,
    };
  }
}
```

### 5.2 Rate Limiter Usage

```typescript
// Create rate limiter for a domain
const rateLimiter = new HTTPRateLimiter({
  tokensPerSecond: 5,
  bucketSize: 10,
  maxQueueSize: 50,
  queueTimeout: 15000,
});

// Use rate limiter before making requests
async function makeRateLimitedRequest(url: string): Promise<Response> {
  await rateLimiter.acquire();

  try {
    const response = await fetch(url);

    // Handle rate limit responses
    if (response.status === 429) {
      const waitTime = rateLimiter.handleRateLimitResponse(response.headers);
      await sleep(waitTime);
      return makeRateLimitedRequest(url); // Retry
    }

    return response;
  } catch (error) {
    throw error;
  }
}
```

### 5.3 Per-Domain Rate Limiting

```typescript
class DomainRateLimiter {
  private limiters: Map<string, HTTPRateLimiter> = new Map();
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig: Partial<RateLimitConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...defaultConfig };
  }

  getLimiter(domain: string): HTTPRateLimiter {
    if (!this.limiters.has(domain)) {
      this.limiters.set(domain, new HTTPRateLimiter(this.defaultConfig));
    }
    return this.limiters.get(domain)!;
  }

  async acquire(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const limiter = this.getLimiter(domain);
    await limiter.acquire();
  }
}
```

---

## 6. User-Facing Errors

### 6.1 CLI Error Handler

**Location:** `/src/cli/errorHandler.ts`

```typescript
export function handleError(_error: Error, context: string): void {
  // Display error message in red
  logger.error(chalk.red(`X ${context} failed: ${_error.message}`));

  // Provide type-specific guidance
  if (_error instanceof AuthenticationError) {
    logger.error(
      chalk.yellow(
        "Tip: Set Google AI Studio API key: export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    logger.error(
      chalk.yellow("Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    logger.error(
      chalk.yellow("For Anthropic: export ANTHROPIC_API_KEY=sk-ant-..."),
    );
    logger.error(
      chalk.yellow(
        "For Azure: export AZURE_OPENAI_API_KEY=... and AZURE_OPENAI_ENDPOINT=...",
      ),
    );
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
  } else if (_error instanceof TimeoutError) {
    logger.error(
      chalk.yellow(
        "Tip: Try increasing the timeout with --timeout <ms> or use a faster model.",
      ),
    );
  } else if (_error instanceof InvalidModelError) {
    logger.error(
      chalk.yellow(
        "Tip: Check available models with 'neurolink models list' or verify model name spelling.",
      ),
    );
  }

  // Only exit if not in loop mode
  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
}
```

### 6.2 User-Friendly Message Guidelines

#### Include Actionable Suggestions

```typescript
context: {
  field: "output.video.resolution",
  providedValue: resolution,
  suggestions: [
    "Use '720p' for standard HD",
    "Use '1080p' for full HD",
  ],
}
```

#### Provide Troubleshooting Steps

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

#### Include Relevant Context

```typescript
return new NeuroLinkError({
  code: ERROR_CODES.INVALID_VIDEO_LENGTH,
  message: `Invalid length '${length}'. Use 4, 6, or 8 seconds`,
  context: {
    field: "output.video.length",
    providedValue: length,
    allowedValues: [4, 6, 8],
    suggestions: [
      "Use 4 for short clips",
      "Use 6 for balanced duration (recommended)",
      "Use 8 for longer videos",
    ],
  },
});
```

### 6.3 Provider-Specific Error Guidance

**Location:** `/src/lib/providers/sagemaker/error-constants.ts`

```typescript
export const ERROR_MESSAGE_TEMPLATES = {
  VALIDATION_ERROR: `
X SageMaker Request Validation Error{endpointContext}

{originalMessage}

Common Solutions:
1. Check your request parameters and format
2. Verify the endpoint name is correct
3. Ensure your request body matches expected format

Tips:
- Double-check endpoint name spelling
- Ensure JSON format is valid
`,

  CREDENTIALS_ERROR: `
X AWS Credentials Error{endpointContext}

{originalMessage}

Setup Instructions:
1. Configure AWS credentials: aws configure
2. Or set environment variables:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION

Tips:
- Verify your IAM user has SageMaker permissions
- Check if credentials have expired
`,

  SERVICE_UNAVAILABLE: `
X SageMaker Service Unavailable{endpointContext}

{originalMessage}

The SageMaker service is temporarily unavailable.

Solutions:
1. Wait a few minutes and retry
2. Check AWS Service Health Dashboard
3. Try a different AWS region

This is usually temporary. Your request should succeed on retry.
`,
} as const;

export function getSageMakerErrorGuidance(
  code: SageMakerErrorCode,
  originalMessage: string,
  endpoint?: string,
): string {
  const template =
    ERROR_MESSAGE_TEMPLATES[code] || ERROR_MESSAGE_TEMPLATES.UNKNOWN_ERROR;
  const endpointContext = endpoint ? ` (endpoint: ${endpoint})` : "";

  return template
    .replace("{endpointContext}", endpointContext)
    .replace("{originalMessage}", originalMessage);
}
```

---

## 7. Error Templates

### 7.1 Adding New Error Codes

```typescript
// In src/lib/utils/errorHandling.ts or src/lib/constants/errorCodes.ts
export const ERROR_CODES = {
  // ... existing codes

  // Add new category
  MY_FEATURE_INVALID_INPUT: "MY_FEATURE_INVALID_INPUT",
  MY_FEATURE_TIMEOUT: "MY_FEATURE_TIMEOUT",
  MY_FEATURE_RESOURCE_EXHAUSTED: "MY_FEATURE_RESOURCE_EXHAUSTED",
  MY_FEATURE_CONNECTION_FAILED: "MY_FEATURE_CONNECTION_FAILED",
} as const;
```

### 7.2 Creating ErrorFactory Methods

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
        ? allowedValues.map((v) => `Use '${v}'`)
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

static myFeatureResourceExhausted(
  resourceType: string,
  current: number,
  limit: number,
): NeuroLinkError {
  return new NeuroLinkError({
    code: ERROR_CODES.MY_FEATURE_RESOURCE_EXHAUSTED,
    message: `${resourceType} limit exceeded: ${current}/${limit}`,
    category: ErrorCategory.RESOURCE,
    severity: ErrorSeverity.HIGH,
    retriable: true,
    context: {
      resourceType,
      current,
      limit,
      suggestions: [
        "Wait for resources to become available",
        "Reduce concurrent operations",
        "Increase resource limits",
      ],
    },
  });
}
```

### 7.3 Domain-Specific Error Class Template

```typescript
// In src/lib/myFeature/errors.ts
export const MY_FEATURE_ERROR_CODES = {
  INVALID_INPUT: "MY_FEATURE_INVALID_INPUT",
  TIMEOUT: "MY_FEATURE_TIMEOUT",
  RESOURCE_EXHAUSTED: "MY_FEATURE_RESOURCE_EXHAUSTED",
  CONNECTION_FAILED: "MY_FEATURE_CONNECTION_FAILED",
} as const;

export type MyFeatureErrorCode =
  (typeof MY_FEATURE_ERROR_CODES)[keyof typeof MY_FEATURE_ERROR_CODES];

export type MyFeatureErrorDetails = {
  operation?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

export class MyFeatureError extends Error {
  public readonly code: MyFeatureErrorCode;
  public readonly statusCode?: number;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly details: MyFeatureErrorDetails;

  constructor(
    message: string,
    options: {
      code: MyFeatureErrorCode;
      statusCode?: number;
      cause?: Error;
      retryable?: boolean;
      details?: MyFeatureErrorDetails;
    },
  ) {
    super(message);
    this.name = "MyFeatureError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};

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
      details: this.details,
      stack: this.stack,
    };
  }

  getUserFriendlyMessage(): string {
    return getMyFeatureErrorGuidance(this.code, this.message, this.details);
  }

  isRetryable(): boolean {
    return this.retryable;
  }
}

// Error guidance templates
const ERROR_GUIDANCE_TEMPLATES: Record<MyFeatureErrorCode, string> = {
  MY_FEATURE_INVALID_INPUT: `
Invalid Input Error

{message}

Solutions:
1. Verify input format matches expected schema
2. Check for required fields
3. Ensure values are within allowed ranges
`,
  MY_FEATURE_TIMEOUT: `
Operation Timeout

{message}

Solutions:
1. Increase timeout configuration
2. Check network connectivity
3. Verify external service availability
`,
  MY_FEATURE_RESOURCE_EXHAUSTED: `
Resource Limit Exceeded

{message}

Solutions:
1. Wait for resources to become available
2. Reduce concurrent operations
3. Contact support to increase limits
`,
  MY_FEATURE_CONNECTION_FAILED: `
Connection Failed

{message}

Solutions:
1. Check network connectivity
2. Verify endpoint URL is correct
3. Check firewall settings
`,
};

export function getMyFeatureErrorGuidance(
  code: MyFeatureErrorCode,
  message: string,
  details?: MyFeatureErrorDetails,
): string {
  const template = ERROR_GUIDANCE_TEMPLATES[code] || "{message}";
  return template.replace("{message}", message);
}

// Helper functions for error creation
export function createMyFeatureError(
  code: MyFeatureErrorCode,
  message: string,
  options: Partial<{
    statusCode: number;
    cause: Error;
    retryable: boolean;
    details: MyFeatureErrorDetails;
  }> = {},
): MyFeatureError {
  const retryableByDefault = [
    MY_FEATURE_ERROR_CODES.TIMEOUT,
    MY_FEATURE_ERROR_CODES.CONNECTION_FAILED,
  ].includes(code);

  return new MyFeatureError(message, {
    code,
    retryable: options.retryable ?? retryableByDefault,
    ...options,
  });
}
```

### 7.4 Validation Function Template

```typescript
// In src/lib/utils/parameterValidation.ts
export type EnhancedValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
};

export function validateMyFeatureOptions(
  options: MyFeatureOptions,
): EnhancedValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate required string field
  const inputError = validateRequiredString(options.input, "input", 1);
  if (inputError) {
    errors.push(inputError);
  }

  // Validate numeric range
  if (options.limit !== undefined) {
    const limitError = validateNumberRange(options.limit, "limit", 1, 100);
    if (limitError) {
      errors.push(limitError);
    }
  }

  // Validate enum value
  if (options.mode && !["fast", "balanced", "quality"].includes(options.mode)) {
    errors.push(
      new ValidationError(
        `Invalid mode '${options.mode}'. Use 'fast', 'balanced', or 'quality'`,
        "mode",
        "INVALID_ENUM",
        ["Use 'balanced' for most use cases"],
      ),
    );
  }

  // Add warnings for deprecated options
  if (options.legacyOption) {
    warnings.push(
      "'legacyOption' is deprecated and will be removed in v2.0. Use 'newOption' instead.",
    );
  }

  // Add helpful suggestions
  if (errors.length === 0) {
    if (!options.caching) {
      suggestions.push("Consider enabling caching for better performance");
    }
    if (options.mode === "quality" && !options.timeout) {
      suggestions.push(
        "Quality mode may take longer - consider setting a higher timeout",
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}
```

### 7.5 Complete Feature Implementation Template

```typescript
// In your feature implementation
import { ErrorFactory } from "../utils/errorHandling.js";
import { validateMyFeatureOptions } from "../utils/parameterValidation.js";
import {
  withTimeout,
  withRetry,
  isRetriableError,
} from "../utils/retryHandler.js";
import { logger } from "../utils/logger.js";

export async function executeMyFeature(
  options: MyFeatureOptions,
): Promise<MyFeatureResult> {
  // 1. Validate input
  const validation = validateMyFeatureOptions(options);
  if (!validation.isValid) {
    const errorMessage = validation.errors.map((e) => e.message).join("; ");
    throw ErrorFactory.invalidParameters(
      "my-feature",
      new Error(errorMessage),
      {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    );
  }

  // Log warnings
  for (const warning of validation.warnings) {
    logger.warn(`[MyFeature] ${warning}`);
  }

  // Log suggestions in debug mode
  for (const suggestion of validation.suggestions) {
    logger.debug(`[MyFeature] Suggestion: ${suggestion}`);
  }

  // 2. Execute with retry and timeout
  try {
    return await withRetry(
      async () => {
        return await withTimeout(
          performOperation(options),
          options.timeout || 30000,
          ErrorFactory.myFeatureTimeout(
            "performOperation",
            options.timeout || 30000,
          ),
        );
      },
      {
        maxAttempts: options.maxRetries || 3,
        delayMs: 1000,
        isRetriable: (error) => {
          // Custom retriability logic
          if (error instanceof MyFeatureError) {
            return error.isRetryable();
          }
          return isRetriableError(error);
        },
        onRetry: (attempt, error) => {
          logger.warn(`[MyFeature] Retry attempt ${attempt}: ${error.message}`);
        },
      },
    );
  } catch (error) {
    // 3. Handle and wrap errors
    if (error instanceof MyFeatureError) {
      throw error; // Already wrapped
    }

    if (error instanceof NeuroLinkError) {
      throw error; // Already wrapped
    }

    // Wrap unknown errors
    logger.error(`[MyFeature] Unexpected error:`, error);
    throw ErrorFactory.toolExecutionFailed("my-feature", error as Error);
  }
}
```

---

## 8. Recovery Strategies

### 8.1 Graceful Degradation

```typescript
// Continue without optional features on error
async function generateWithAnalytics(
  options: GenerateOptions,
): Promise<EnhancedResult> {
  const result = await this.generate(options);
  let enhancedResult: EnhancedResult = { ...result };

  // Try to add analytics, but don't fail if it errors
  try {
    const analytics = await this.createAnalytics(result, responseTime, options);
    enhancedResult.analytics = analytics;
  } catch (error) {
    logger.warn(`Analytics creation failed, continuing without:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    // Result still returned without analytics
  }

  // Try to add suggestions, but don't fail if it errors
  try {
    const suggestions = await this.generateSuggestions(result);
    enhancedResult.suggestions = suggestions;
  } catch (error) {
    logger.warn(`Suggestions generation failed, continuing without:`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return enhancedResult;
}
```

### 8.2 Fallback Streaming

```typescript
// In BaseProvider.stream()
async stream(options: StreamOptions): Promise<StreamResult> {
  try {
    // Try real streaming first
    const realStreamResult = await this.executeStream(options, analysisSchema);
    return realStreamResult;
  } catch (realStreamError) {
    logger.warn(
      `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
      { error: (realStreamError as Error).message },
    );

    // Fallback to fake streaming if tools are enabled
    if (!options.disableTools && this.supportsTools()) {
      return await this.executeFakeStreaming(options, analysisSchema);
    } else {
      throw this.handleProviderError(realStreamError);
    }
  }
}
```

### 8.3 Provider Fallback with ModelRouter

```typescript
// Automatic retry with fallback provider
async function generateWithFallback(options: GenerateOptions): Promise<Result> {
  const providers = ["openai", "anthropic", "vertex"];
  let lastError: Error | undefined;

  for (const provider of providers) {
    try {
      return await this.generate({ ...options, provider });
    } catch (error) {
      lastError = error as Error;

      // Don't fallback for validation errors - they won't succeed on other providers
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.warn(`Provider ${provider} failed, trying fallback:`, {
        error: lastError.message,
      });
    }
  }

  throw lastError || new Error("All providers failed");
}
```

### 8.4 Graceful Shutdown

**Location:** `/src/lib/utils/retryHandler.ts`

```typescript
export class GracefulShutdown {
  private operations: Set<Promise<unknown>> = new Set();
  private shuttingDown = false;

  track<T>(operation: Promise<T>): Promise<T> {
    if (this.shuttingDown) {
      throw new Error("System is shutting down - cannot accept new operations");
    }

    this.operations.add(operation);
    operation.finally(() => {
      this.operations.delete(operation);
    });
    return operation;
  }

  async shutdown(timeoutMs = 30000): Promise<void> {
    this.shuttingDown = true;
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
      logger.debug("Graceful shutdown completed successfully");
    } catch (error) {
      logger.warn(`Shutdown warning: ${(error as Error).message}`);
      // Force shutdown after warning
    } finally {
      this.operations.clear();
    }
  }

  isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  getPendingCount(): number {
    return this.operations.size;
  }
}

// Usage
const shutdown = new GracefulShutdown();

// Track operations
const result = await shutdown.track(performOperation());

// On SIGTERM/SIGINT
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, starting graceful shutdown...");
  await shutdown.shutdown(30000);
  process.exit(0);
});
```

### 8.5 Guardrails Error Recovery

```typescript
// Handle guardrail blocks with automatic provider switch
async function generateWithGuardrails(
  options: GenerateOptions,
): Promise<Result> {
  try {
    return await this.generate(options);
  } catch (error) {
    // Check if this is a guardrail/content policy error
    if (isGuardrailError(error)) {
      logger.warn("Content blocked by guardrails, trying fallback provider");

      // Try with a different provider via ModelRouter
      const fallbackProvider = this.modelRouter.getFallbackProvider(
        options.provider,
      );
      if (fallbackProvider) {
        return await this.generate({ ...options, provider: fallbackProvider });
      }
    }
    throw error;
  }
}

function isGuardrailError(error: unknown): boolean {
  if (error instanceof Error) {
    const guardrailPatterns = [
      /content policy/i,
      /guardrail/i,
      /jailbreak/i,
      /content filter/i,
      /blocked by safety/i,
    ];
    return guardrailPatterns.some((pattern) => pattern.test(error.message));
  }
  return false;
}
```

---

## 9. Best Practices

### 9.1 Always Use ErrorFactory for Consistency

```typescript
// Good - uses factory for consistent structure
throw ErrorFactory.toolNotFound(toolName, availableTools);

// Avoid - ad-hoc error creation
throw new Error(`Tool ${toolName} not found`);
```

### 9.2 Include Rich Context

```typescript
// Good - includes context for debugging
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

// Avoid - no context
throw new Error("Invalid temperature");
```

### 9.3 Mark Retriability Correctly

```typescript
// Network errors are usually retriable
retriable: true;

// Validation errors are not retriable
retriable: false;

// Check error type for automatic recovery
if (error instanceof NeuroLinkError && error.retriable) {
  // Implement retry logic
}
```

### 9.4 Preserve Original Errors

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

### 9.5 Log Before Throwing

```typescript
try {
  await operation();
} catch (error) {
  logger.error(`Operation failed:`, {
    error: error instanceof Error ? error.message : String(error),
    context: { operationName, params },
  });
  throw this.handleProviderError(error);
}
```

### 9.6 Use Type Guards for Error Handling

```typescript
function isNeuroLinkError(error: unknown): error is NeuroLinkError {
  return error instanceof NeuroLinkError;
}

function isSageMakerError(error: unknown): error is SageMakerError {
  return error instanceof SageMakerError;
}

// Usage
try {
  await performOperation();
} catch (error) {
  if (isNeuroLinkError(error)) {
    handleNeuroLinkError(error);
  } else if (isSageMakerError(error)) {
    handleSageMakerError(error);
  } else {
    handleGenericError(error);
  }
}
```

### 9.7 Export Error Types for Consumers

```typescript
// In src/lib/index.ts
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
  ErrorCategory,
  ErrorSeverity,
} from "./utils/errorHandling.js";

export { ValidationError } from "./utils/parameterValidation.js";
export { TimeoutError } from "./utils/timeout.js";
```

### 9.8 Document Error Scenarios

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

## 10. Quick Reference

### 10.1 Key Files

| File                                   | Purpose                                       |
| -------------------------------------- | --------------------------------------------- |
| `src/lib/types/errors.ts`              | Base error classes (BaseError, ProviderError) |
| `src/lib/utils/errorHandling.ts`       | NeuroLinkError, ErrorFactory, ERROR_CODES     |
| `src/lib/constants/enums.ts`           | ErrorCategory, ErrorSeverity enums            |
| `src/lib/utils/timeout.ts`             | TimeoutError, timeout utilities               |
| `src/lib/utils/retryHandler.ts`        | Retry logic, CircuitBreaker, GracefulShutdown |
| `src/lib/mcp/httpRetryHandler.ts`      | HTTP-specific retry logic                     |
| `src/lib/mcp/httpRateLimiter.ts`       | Token bucket rate limiter                     |
| `src/lib/mcp/mcpCircuitBreaker.ts`     | MCP-specific circuit breaker                  |
| `src/lib/utils/parameterValidation.ts` | ValidationError, validation functions         |
| `src/cli/errorHandler.ts`              | CLI-specific error handling                   |

### 10.2 Error Flow Diagram

```
1. Operation Attempt
       |
       v
2. Input Validation -----> Validation Error (not retriable)
       |
       v
3. Rate Limiter Check ----> Queue Full/Timeout Error
       |
       v
4. Circuit Breaker Check --> Circuit Open Error
       |
       v
5. Execute with Timeout ---> Timeout Error (retriable)
       |
       v
6. Retry Logic ------------> Max Retries Exceeded
       |
       v
7. Error Classification
       |
       +---> Categorize (validation, network, etc.)
       +---> Assign severity
       +---> Determine retriability
       |
       v
8. Error Handling
       |
       +---> Log structured error
       +---> Trigger alerts if critical
       +---> Return user-friendly message
```

### 10.3 Retriability Quick Reference

| Error Type            | Retriable | Reason                         |
| --------------------- | --------- | ------------------------------ |
| ValidationError       | No        | Input won't change on retry    |
| AuthenticationError   | No        | Credentials won't change       |
| AuthorizationError    | No        | Permissions won't change       |
| NetworkError          | Yes       | Network may recover            |
| TimeoutError          | Yes       | Server may become available    |
| RateLimitError        | Yes       | Rate limits reset over time    |
| TOOL_EXECUTION_FAILED | Yes       | Transient failures may resolve |
| TOOL_NOT_FOUND        | No        | Tool won't magically appear    |
| Circuit Open          | Yes       | After reset timeout            |

### 10.4 Severity Quick Reference

| Severity | When to Use                              | Example                 |
| -------- | ---------------------------------------- | ----------------------- |
| CRITICAL | System-wide impact, data corruption      | Memory exhaustion       |
| HIGH     | Current operation significantly affected | Auth failures, timeouts |
| MEDIUM   | Recoverable issues                       | Validation errors       |
| LOW      | Minor issues, informational              | Deprecation warnings    |

---

## Summary

This guide covers NeuroLink's complete error handling system:

1. **Error Hierarchy** - Structured inheritance from BaseError to domain-specific errors
2. **ErrorFactory** - Consistent error creation with rich context and suggestions
3. **Retry Mechanisms** - Exponential backoff with jitter to prevent thundering herd
4. **Circuit Breakers** - Three-state pattern to prevent cascading failures
5. **Rate Limiting** - Token bucket algorithm for request throttling
6. **User-Facing Errors** - Actionable guidance with troubleshooting steps
7. **Error Templates** - Ready-to-use patterns for new features
8. **Recovery Strategies** - Graceful degradation, fallbacks, and shutdown

**Key Principles:**

- Use ErrorFactory for all error creation
- Include rich context for debugging
- Mark retriability explicitly
- Preserve original error information
- Log before throwing
- Provide actionable user guidance
- Document error scenarios in JSDoc
