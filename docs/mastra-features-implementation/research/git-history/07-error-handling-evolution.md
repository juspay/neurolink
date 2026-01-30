# Error Handling Evolution in NeuroLink

## Executive Summary

This document analyzes how error handling evolved in NeuroLink from basic string-based exceptions to a comprehensive, type-safe error system with error codes, categorization, retry mechanisms, and circuit breakers. The evolution spans from June 2025 to January 2026, demonstrating a maturation from ad-hoc error handling to enterprise-grade fault tolerance.

---

## Timeline Overview

| Phase   | Date Range          | Key Milestone                     |
| ------- | ------------------- | --------------------------------- |
| Phase 1 | Jun 2025            | Provider timeout support          |
| Phase 2 | Aug 2025            | Type-safe error system foundation |
| Phase 3 | Aug 2025            | Comprehensive retry handler       |
| Phase 4 | Sep-Oct 2025        | CLI loop mode error handling      |
| Phase 5 | Oct 2025            | Error enums centralization        |
| Phase 6 | Dec 2025            | Comprehensive error code system   |
| Phase 7 | Dec 2025 - Jan 2026 | Domain-specific error types       |
| Phase 8 | Jan 2026            | HTTP retry and rate limiting      |

---

## Phase 1: Provider Timeout Support (June 2025)

### Commit: `8610f4a`

**Date:** June 29, 2025
**Author:** Parth Dogra
**Message:** `feat(timeout): add comprehensive timeout support for all AI providers`

This commit introduced the first systematic approach to timeout handling across all providers.

### Key Files Added/Modified:

- `src/lib/utils/timeout.ts` - Timeout utilities
- `src/lib/providers/timeout-wrapper.ts` - Provider timeout wrapper
- All provider files updated

### TimeoutError Class Pattern:

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

### Provider-Specific Defaults Introduced:

```typescript
export const DEFAULT_TIMEOUTS = {
  global: "30s",
  streaming: "2m",
  providers: {
    openai: "30s",
    bedrock: "45s",
    vertex: "60s",
    anthropic: "30s",
    azure: "30s",
    "google-ai": "30s",
    huggingface: "2m",
    ollama: "5m",
    mistral: "45s",
  },
  tools: {
    default: "10s",
    filesystem: "5s",
    network: "30s",
    computation: "2m",
  },
};
```

### Lessons Learned:

1. Different providers have vastly different response times
2. Streaming operations need longer timeouts than synchronous ones
3. Local models (Ollama) require significantly more time
4. Tool execution timeouts should be separate from provider timeouts

---

## Phase 2: Type-Safe Error System Foundation (August 2025)

### Commit: `5db2231`

**Date:** August 20, 2025
**Author:** Yasmeen Naaz
**Message:** `refactor(core): replace fragile string-based errors with a type-safe system`

This commit replaced ad-hoc string-based error handling with structured error classes.

### Key Files Modified:

- `src/lib/types/errors.ts` - Error class definitions
- `src/cli/index.ts` - CLI error handling
- Provider files (openAI.ts, anthropic.ts, googleAiStudio.ts)

### Error Class Hierarchy Introduced:

```typescript
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProviderError extends BaseError {
  constructor(
    message: string,
    public provider?: string,
  ) {
    super(provider ? `[${provider}] ${message}` : message);
  }
}

export class AuthenticationError extends ProviderError {}
export class AuthorizationError extends ProviderError {}
export class NetworkError extends ProviderError {}
export class RateLimitError extends ProviderError {}
export class InvalidModelError extends ProviderError {}
```

### Pattern Adopted: Error Inheritance Hierarchy

The inheritance pattern allows:

- Catching specific error types
- Catching broad categories (e.g., all ProviderErrors)
- Provider context in error messages
- Consistent error naming

---

## Phase 3: Comprehensive Retry Handler (August 2025)

### Commit: `37d5cb1`

**Date:** August 3, 2025
**Author:** Sachin Sharma
**Message:** `feat(core): complete NeuroLink Phase 1-4 implementation with comprehensive verification`

This major commit introduced the comprehensive retry handler with exponential backoff.

### Key File: `src/lib/utils/retryHandler.ts`

### Exponential Backoff Algorithm:

```typescript
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number = SYSTEM_LIMITS.DEFAULT_INITIAL_DELAY,
  multiplier: number = SYSTEM_LIMITS.DEFAULT_BACKOFF_MULTIPLIER,
  maxDelay: number = SYSTEM_LIMITS.DEFAULT_MAX_DELAY,
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

### Retry Condition Detection:

```typescript
retryCondition: (error: unknown) => {
  // Retry on network errors, timeouts, and specific HTTP errors
  if (error instanceof NetworkError || error instanceof TemporaryError) {
    return true;
  }
  // Retry on timeout errors
  if (error?.name === "TimeoutError" || error?.code === "TIMEOUT") {
    return true;
  }
  // Retry on network-related errors
  if (
    ["ECONNRESET", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(
      error?.code,
    )
  ) {
    return true;
  }
  // Retry on HTTP 5xx errors and some 4xx errors
  if (error?.status) {
    const status = Number(error.status);
    return status >= 500 || status === 429 || status === 408;
  }
  return false;
};
```

### Circuit Breaker Pattern Introduced:

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
    // ... execute with success/failure handling
  }
}
```

### Lessons Learned:

1. Jitter prevents "thundering herd" problems during retries
2. Circuit breakers prevent cascading failures
3. Different error types require different retry strategies
4. Rate limiters complement retry logic

---

## Phase 4: CLI Loop Mode Error Handling (September-October 2025)

### Commit: `89b5012`

**Date:** ~September 2025
**Author:** [Multiple]
**Message:** `feat(cli): Implement interactive loop mode`

This commit introduced user-friendly error handling for the CLI.

### Key File: `src/cli/errorHandler.ts`

### User-Facing Error Messages Pattern:

```typescript
export function handleError(_error: Error, context: string): void {
  logger.error(chalk.red(`${context} failed: ${_error.message}`));

  if (_error instanceof AuthenticationError) {
    logger.error(
      chalk.yellow(
        "Set Google AI Studio API key (RECOMMENDED): export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    logger.error(
      chalk.yellow("Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    // ... provider-specific guidance
  } else if (_error instanceof RateLimitError) {
    logger.error(
      chalk.yellow("Try again in a few moments or use --provider vertex"),
    );
  } else if (_error instanceof AuthorizationError) {
    logger.error(
      chalk.yellow(
        "Check your account permissions for the selected model/service.",
      ),
    );
  } else if (_error instanceof NetworkError) {
    logger.error(
      chalk.yellow(
        "Check your internet connection and the provider's status page.",
      ),
    );
  }

  // Don't exit in loop mode
  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
}
```

### Lessons Learned:

1. Different error types need different user guidance
2. Interactive modes should not exit on errors
3. Actionable suggestions improve user experience
4. Color-coded messages help users scan for important information

---

## Phase 5: Error Enums Centralization (October 2025)

### Commit: `0e13ba1`

**Date:** October 27, 2025
**Author:** Sudharsan R
**Message:** `refactor(types): Centralize type system and extract enums to constants`

This commit centralized error-related enums to a single location.

### Key File: `src/lib/constants/enums.ts`

### ErrorCategory Enum:

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

### ErrorSeverity Enum:

```typescript
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
```

### Lessons Learned:

1. Centralized enums prevent duplication and inconsistency
2. Separating enums from implementation improves maintainability
3. Category-based classification enables proper error routing
4. Severity levels help prioritize error handling

---

## Phase 6: Comprehensive Error Code System (December 2025)

### Commit: `b2ee7c4`

**Date:** December 8, 2025
**Author:** Sharifajahan Shaik
**Message:** `fix(error-handling): standardize error handling with comprehensive error code system`

This major commit introduced the standardized error code system that became the foundation for all error handling.

### Key Files Added/Modified:

- `src/lib/constants/errorCodes.ts` - Comprehensive error codes
- `src/lib/utils/errorHandling.ts` - Enhanced error handling utilities
- `src/lib/hitl/hitlErrors.ts` - HITL-specific error handling
- `docs/error-handling-standard.md` - Documentation

### ERROR_CODES Structure:

```typescript
export const ERROR_CODES = {
  // Tool errors
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  TOOL_TIMEOUT: "TOOL_TIMEOUT",
  TOOL_VALIDATION_FAILED: "TOOL_VALIDATION_FAILED",
  TOOL_DISCOVERY_FAILED: "TOOL_DISCOVERY_FAILED",

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

  // Validation errors
  VALIDATION_INVALID_PARAMETERS: "VALIDATION_INVALID_PARAMETERS",
  VALIDATION_MISSING_REQUIRED_PARAM: "VALIDATION_MISSING_REQUIRED_PARAM",

  // Configuration errors
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_MISSING: "CONFIG_MISSING",

  // MCP errors
  MCP_SERVER_NOT_FOUND: "MCP_SERVER_NOT_FOUND",
  MCP_SERVER_CONNECTION_FAILED: "MCP_SERVER_CONNECTION_FAILED",

  // HITL errors
  HITL_USER_REJECTED: "HITL_USER_REJECTED",
  HITL_TIMEOUT: "HITL_TIMEOUT",
  HITL_CONFIGURATION_INVALID: "HITL_CONFIGURATION_INVALID",

  // System errors
  SYSTEM_INTERNAL_ERROR: "SYSTEM_INTERNAL_ERROR",
  MEMORY_EXHAUSTED: "MEMORY_EXHAUSTED",
} as const;
```

### Enhanced NeuroLinkError Class:

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

### ErrorFactory Pattern:

```typescript
export class ErrorFactory {
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
  // ... many more factory methods
}
```

### Lessons Learned:

1. Error codes enable programmatic error handling
2. Factory methods ensure consistency across the codebase
3. Context information is crucial for debugging
4. Retriability flag enables automatic recovery
5. Severity levels help with alerting and logging

---

## Phase 7: Domain-Specific Error Types (December 2025)

### Video Error Handling

**Commit:** `6181008`
**Date:** December 1, 2025
**Message:** `Add video error handling types for VideoProcessor`

```typescript
export const VideoErrorCodes = {
  INVALID_VIDEO_FORMAT: "INVALID_VIDEO_FORMAT",
  VIDEO_TOO_LARGE: "VIDEO_TOO_LARGE",
  VIDEO_TOO_LONG: "VIDEO_TOO_LONG",
  FFMPEG_NOT_FOUND: "FFMPEG_NOT_FOUND",
  FRAME_EXTRACTION_FAILED: "FRAME_EXTRACTION_FAILED",
  METADATA_EXTRACTION_FAILED: "METADATA_EXTRACTION_FAILED",
  VIDEO_UPLOAD_FAILED: "VIDEO_UPLOAD_FAILED",
} as const;

export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public code: VideoErrorCode,
    public details?: VideoErrorDetails,
  ) {
    super(message);
    this.name = "VideoProcessingError";
  }
}

// Helper functions for error creation
export function createVideoTooLargeError(
  fileSize: number,
  maxSize: number,
  filePath?: string,
): VideoValidationError {
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
  return new VideoValidationError(
    `Video file size (${fileSizeMB} MB) exceeds maximum allowed size (${maxSizeMB} MB)`,
    { fileSize, maxSize, filePath },
  );
}
```

### Image Processing Error Context

**Commit:** `8943836`
**Date:** December 2, 2025
**Message:** `feat(imageProcessor): add error context to image processing methods`

Added structured error context:

- File path
- Provider name
- Model name
- Operation type

### CSV Error Enhancement

**Commit:** `9c3eb9e`
**Date:** December 13, 2025
**Message:** `Enhance CSV error messages with contextual information (CSV-013)`

### PDF Password-Protected Handling

**Commit:** `d74be4a`
**Date:** December 13, 2025
**Message:** `Add password-protected PDF handling with comprehensive tests`

Clear error messages for:

- Password required
- Incorrect password
- Various encryption types (AES-256, AES-128, RC4)

### Lessons Learned:

1. Domain-specific errors provide better context
2. Helper functions ensure consistent error creation
3. Details objects enable rich debugging information
4. Type guards help with error handling in catch blocks

---

## Phase 8: HTTP Retry and Rate Limiting (January 2026)

### Commit: `67f1c23`

**Date:** January 2, 2026
**Author:** Sachin Sharma
**Message:** `feat(mcp): add HTTP/Streamable HTTP transport support for MCP servers`

This commit introduced sophisticated HTTP retry and rate limiting for MCP servers.

### Key Files:

- `src/lib/mcp/httpRetryHandler.ts`
- `src/lib/mcp/httpRateLimiter.ts`

### HTTP Retry Handler:

```typescript
export const DEFAULT_HTTP_RETRY_CONFIG: HTTPRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export function isRetryableHTTPError(
  error: unknown,
  config: HTTPRetryConfig = DEFAULT_HTTP_RETRY_CONFIG,
): boolean {
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
  if (
    [
      "ECONNRESET",
      "ENOTFOUND",
      "ECONNREFUSED",
      "ECONNABORTED",
      "EPIPE",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ].includes(errorObj.code)
  ) {
    return true;
  }
  // Check for HTTP status codes
  if (typeof errorObj.status === "number") {
    return isRetryableStatusCode(errorObj.status, config);
  }
  return false;
}
```

### Token Bucket Rate Limiter:

```typescript
export class HTTPRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  private waitQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  async acquire(): Promise<void> {
    if (this.tryAcquire()) {
      return;
    }
    // Add to wait queue
    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  handleRateLimitResponse(headers: Headers): number {
    // Parse Retry-After header
    const retryAfter = headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    // Check for X-RateLimit-Reset header
    const rateLimitReset = headers.get("X-RateLimit-Reset");
    // ...
  }
}
```

### Network Retry with Exponential Backoff

**Commit:** `3b29e24`
**Date:** January 15, 2026
**Message:** `fix(provider): add network retry logic with exponential backoff to detection operations`

### Rate Limiter for URL Downloads

**Commit:** `0e3e779`
**Date:** January 21, 2026
**Message:** `feat(security): Implement token bucket rate limiter for URL downloads`

### Lessons Learned:

1. Token bucket algorithm balances throughput and protection
2. Server headers (Retry-After) should be respected
3. Different domains need separate rate limiters
4. Health monitoring helps identify problematic endpoints

---

## Additional Notable Commits

### Guardrails Error Handling

**Commit:** `ae42552`
**Date:** November 18, 2025
**Message:** `fix(guardrails): added fallback for guardrail errors on azure's jailbreak errors`

Implemented automatic retry with fallback provider via ModelRouter when guardrails block content.

### Tool Error Population Fix

**Commit:** `111f5ca`
**Date:** January 5, 2026
**Message:** `fix(tools): Error not getting populated inspite tool result has error`

Fixed error propagation when tool execution results contain errors.

### Inconsistent Error Handling Fix

**Commit:** `31b10ec`
**Date:** December 22, 2025
**Message:** `Fix inconsistent error handling in file processing (MB-004)`

- Replaced silent error logging with proper error throwing
- Removed error text embedding in prompts
- Added descriptive error messages with filename context

### Base64 Validation Security Fix

**Commit:** `f1b9b9c`
**Date:** December 20, 2025
**Message:** `fix(Validation): implement secure base64 validation with fail-fast checks`

Prevents memory exhaustion from invalid input:

- Validate format with regex BEFORE buffer allocation
- Check length is multiple of 4
- Validate character set
- Validate padding position

---

## Error Handling Architecture Summary

### Current Architecture (as of January 2026)

```
                     NeuroLinkError (base)
                            |
        +-------------------+-------------------+
        |                   |                   |
  ProviderError       ToolError          VideoProcessingError
        |                   |                   |
  +-----+-----+     +-------+-------+    +------+------+
  |     |     |     |       |       |    |      |      |
Auth  Rate Network Timeout Exec  Valid  Valid Extract Upload
Error Limit Error  Error  Failed Error  Error  Error  Error
```

### Error Flow:

```
1. Operation Attempt
       |
       v
2. Try with Timeout
       |
       +---> Timeout? --> TimeoutError
       |
       v
3. Retry Logic (if retriable)
       |
       +---> Max retries? --> Last error thrown
       |
       v
4. Circuit Breaker Check
       |
       +---> Open? --> CircuitBreakerError
       |
       v
5. Rate Limiter Check
       |
       +---> Exceeded? --> RateLimitError
       |
       v
6. Operation Execution
       |
       +---> Success? --> Return result
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

---

## Best Practices Established

### 1. Error Creation

- Always use ErrorFactory methods for consistency
- Include context information for debugging
- Preserve original error stack traces
- Assign appropriate severity levels

### 2. Error Handling

- Use type guards for specific error handling
- Check retriability before attempting recovery
- Implement circuit breakers for external services
- Use rate limiters to prevent abuse

### 3. User-Facing Errors

- Provide actionable suggestions
- Use color-coded messages for visibility
- Include relevant documentation links
- Suggest alternative approaches

### 4. Logging

- Use structured logging (JSON format)
- Include timestamps and request IDs
- Log different severities appropriately
- Avoid logging sensitive information

### 5. Recovery Strategies

- Implement exponential backoff with jitter
- Use circuit breakers to prevent cascading failures
- Provide graceful degradation paths
- Allow manual intervention for critical errors

---

## Lessons Learned Summary

1. **Type Safety Matters**: Transitioning from string-based to type-safe errors significantly reduced bugs
2. **Categorization Enables Automation**: Error categories enable proper routing and handling
3. **Context is Crucial**: Detailed context makes debugging much easier
4. **Retriability Should Be Explicit**: Clear retriability flags enable automatic recovery
5. **Factory Methods Ensure Consistency**: Using factories prevents ad-hoc error creation
6. **User Guidance Improves UX**: Actionable suggestions help users resolve issues
7. **Domain-Specific Errors Add Value**: Specialized error types provide better context
8. **Rate Limiting Protects Systems**: Token bucket algorithms balance throughput and protection
9. **Circuit Breakers Prevent Cascading Failures**: They're essential for resilient systems
10. **Testing Error Handling is Critical**: Comprehensive tests ensure error paths work correctly

---

## Files Reference

| File                              | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `src/lib/types/errors.ts`         | Base error classes (legacy)                |
| `src/lib/utils/errorHandling.ts`  | NeuroLinkError, ErrorFactory, utilities    |
| `src/lib/constants/enums.ts`      | ErrorCategory, ErrorSeverity enums         |
| `src/lib/utils/timeout.ts`        | TimeoutError, timeout utilities            |
| `src/lib/utils/retryHandler.ts`   | Retry logic, circuit breaker, rate limiter |
| `src/lib/mcp/httpRetryHandler.ts` | HTTP-specific retry logic                  |
| `src/lib/mcp/httpRateLimiter.ts`  | Token bucket rate limiter                  |
| `src/lib/types/videoErrors.ts`    | Video processing errors                    |
| `src/lib/hitl/hitlErrors.ts`      | Human-in-the-loop errors                   |
| `src/cli/errorHandler.ts`         | CLI-specific error handling                |

---

## Recommendations for Future Development

1. **Consider Error Aggregation**: For batch operations, aggregate errors instead of failing on first
2. **Add Telemetry Integration**: Connect error handling to observability platforms
3. **Implement Error Budgets**: Track error rates and implement circuit breakers based on budgets
4. **Create Error Documentation**: Generate documentation from error codes automatically
5. **Add Internationalization**: Support localized error messages
6. **Implement Error Recovery Hints**: Provide machine-readable recovery instructions
