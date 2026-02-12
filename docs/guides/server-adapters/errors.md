---
title: Error Handling
sidebar_label: "Error Handling"
description: Comprehensive error handling guide for NeuroLink server adapters with typed error classes, recovery strategies, and best practices
sidebar_position: 9
keywords: error handling, errors, exceptions, recovery, retry, server adapters
---

# Error Handling

NeuroLink server adapters provide a comprehensive error handling system with typed error classes, automatic recovery strategies, and structured error responses. This guide covers the complete error hierarchy and how to handle errors effectively.

---

## Error Architecture Overview

The server adapter error system is built around:

1. **Typed Error Classes** - 23 specialized error classes extending `ServerAdapterError`
2. **Error Categories** - 9 categories for logical grouping
3. **Severity Levels** - 4 levels for prioritization
4. **Recovery Strategies** - Automatic retry and backoff configurations
5. **HTTP Status Mapping** - Consistent HTTP status code mapping

```
ServerAdapterError (base class)
├── ConfigurationError
├── RouteConflictError
├── RouteNotFoundError
├── ValidationError
├── AuthenticationError
├── InvalidAuthenticationError
├── AuthorizationError
├── RateLimitError
├── TimeoutError
├── HandlerError
├── StreamingError
├── StreamAbortedError
├── WebSocketError
├── WebSocketConnectionError
├── ServerStartError
├── ServerStopError
├── AlreadyRunningError
├── NotRunningError
├── ShutdownTimeoutError
├── DrainTimeoutError
├── InvalidLifecycleStateError
└── MissingDependencyError
```

---

## Error Categories

Errors are grouped into 9 categories that determine handling behavior and recovery strategies:

| Category         | Description                             | Recovery Strategy   |
| ---------------- | --------------------------------------- | ------------------- |
| `CONFIG`         | Configuration and setup errors          | Fail immediately    |
| `VALIDATION`     | Input validation and schema errors      | Fail immediately    |
| `EXECUTION`      | Runtime handler and processing errors   | Retry (3 attempts)  |
| `EXTERNAL`       | External service and dependency errors  | Exponential backoff |
| `RATE_LIMIT`     | Rate limiting exceeded                  | Exponential backoff |
| `AUTHENTICATION` | Missing or invalid authentication       | Fail immediately    |
| `AUTHORIZATION`  | Permission and access denied errors     | Fail immediately    |
| `STREAMING`      | Streaming and SSE errors                | Retry (2 attempts)  |
| `WEBSOCKET`      | WebSocket connection and message errors | Exponential backoff |

---

## Severity Levels

Each error has a severity level for logging and alerting:

| Severity   | Description                                      | Example Errors                           |
| ---------- | ------------------------------------------------ | ---------------------------------------- |
| `LOW`      | Minor issues, typically user errors              | RouteNotFoundError, StreamAbortedError   |
| `MEDIUM`   | Moderate issues that may need attention          | TimeoutError, AuthenticationError        |
| `HIGH`     | Serious issues that should be investigated       | HandlerError, ConfigurationError         |
| `CRITICAL` | System-level failures requiring immediate action | ServerStartError, MissingDependencyError |

---

## Error Classes Reference

### Base Class: ServerAdapterError

All server adapter errors extend this base class:

```typescript
import { ServerAdapterError } from "@juspay/neurolink";

class ServerAdapterError extends Error {
  readonly code: string; // Unique error code
  readonly category: string; // Error category
  readonly severity: string; // Severity level
  readonly retryable: boolean; // Whether retry is recommended
  readonly retryAfterMs?: number; // Suggested retry delay
  readonly requestId?: string; // Request identifier for tracing
  readonly path?: string; // Request path
  readonly method?: string; // HTTP method
  readonly details?: object; // Additional error details
  readonly cause?: Error; // Original error if wrapped

  toJSON(): object; // Serialize for API response
  getHttpStatus(): number; // Get appropriate HTTP status
}
```

### Configuration Errors

#### ConfigurationError

Thrown when server configuration is invalid.

```typescript
import { ConfigurationError } from "@juspay/neurolink";

throw new ConfigurationError(
  "Invalid port number: must be between 1 and 65535",
  { port: 99999, field: "port" },
);
```

| Property    | Value                           |
| ----------- | ------------------------------- |
| Code        | `SERVER_ADAPTER_INVALID_CONFIG` |
| Category    | `CONFIG`                        |
| Severity    | `HIGH`                          |
| HTTP Status | 400                             |
| Retryable   | No                              |

#### MissingDependencyError

Thrown when a required framework dependency is not installed.

```typescript
import { MissingDependencyError } from "@juspay/neurolink";

throw new MissingDependencyError("express", "Express", "npm install express");
```

| Property    | Value                               |
| ----------- | ----------------------------------- |
| Code        | `SERVER_ADAPTER_MISSING_DEPENDENCY` |
| Category    | `CONFIG`                            |
| Severity    | `CRITICAL`                          |
| HTTP Status | 500                                 |
| Retryable   | No                                  |

### Route Errors

#### RouteConflictError

Thrown when registering a route that conflicts with an existing route.

```typescript
import { RouteConflictError } from "@juspay/neurolink";

throw new RouteConflictError("/api/users/:id", "GET", "/api/users/:userId");
```

| Property    | Value                           |
| ----------- | ------------------------------- |
| Code        | `SERVER_ADAPTER_ROUTE_CONFLICT` |
| Category    | `CONFIG`                        |
| Severity    | `HIGH`                          |
| HTTP Status | 500                             |
| Retryable   | No                              |

#### RouteNotFoundError

Thrown when a requested route does not exist.

```typescript
import { RouteNotFoundError } from "@juspay/neurolink";

throw new RouteNotFoundError("/api/unknown", "GET", "req-123");
```

| Property    | Value                            |
| ----------- | -------------------------------- |
| Code        | `SERVER_ADAPTER_ROUTE_NOT_FOUND` |
| Category    | `VALIDATION`                     |
| Severity    | `LOW`                            |
| HTTP Status | 404                              |
| Retryable   | No                               |

### Validation Errors

#### ValidationError

Thrown when request validation fails.

```typescript
import { ValidationError } from "@juspay/neurolink";

throw new ValidationError(
  [
    { field: "email", message: "Invalid email format", value: "not-an-email" },
    { field: "age", message: "Must be a positive number", value: -5 },
  ],
  "req-123",
);
```

| Property    | Value                             |
| ----------- | --------------------------------- |
| Code        | `SERVER_ADAPTER_VALIDATION_ERROR` |
| Category    | `VALIDATION`                      |
| Severity    | `LOW`                             |
| HTTP Status | 400                               |
| Retryable   | No                                |

### Authentication & Authorization Errors

#### AuthenticationError

Thrown when authentication is required but not provided.

```typescript
import { AuthenticationError } from "@juspay/neurolink";

throw new AuthenticationError("Bearer token required", "req-123");
```

| Property    | Value                          |
| ----------- | ------------------------------ |
| Code        | `SERVER_ADAPTER_AUTH_REQUIRED` |
| Category    | `AUTHENTICATION`               |
| Severity    | `MEDIUM`                       |
| HTTP Status | 401                            |
| Retryable   | No                             |

#### InvalidAuthenticationError

Thrown when provided authentication credentials are invalid.

```typescript
import { InvalidAuthenticationError } from "@juspay/neurolink";

throw new InvalidAuthenticationError("Token expired", "req-123");
```

| Property    | Value                         |
| ----------- | ----------------------------- |
| Code        | `SERVER_ADAPTER_AUTH_INVALID` |
| Category    | `AUTHENTICATION`              |
| Severity    | `MEDIUM`                      |
| HTTP Status | 401                           |
| Retryable   | No                            |

#### AuthorizationError

Thrown when the authenticated user lacks required permissions.

```typescript
import { AuthorizationError } from "@juspay/neurolink";

throw new AuthorizationError(
  "Insufficient permissions to access this resource",
  "req-123",
  ["admin", "moderator"],
);
```

| Property    | Value                      |
| ----------- | -------------------------- |
| Code        | `SERVER_ADAPTER_FORBIDDEN` |
| Category    | `AUTHORIZATION`            |
| Severity    | `MEDIUM`                   |
| HTTP Status | 403                        |
| Retryable   | No                         |

### Rate Limiting Errors

#### RateLimitError

Thrown when request rate limits are exceeded.

```typescript
import { RateLimitError } from "@juspay/neurolink";

throw new RateLimitError(
  60000, // retry after 60 seconds
  "Rate limit exceeded: 100 requests per minute",
  "req-123",
);
```

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Code        | `SERVER_ADAPTER_RATE_LIMIT_EXCEEDED` |
| Category    | `RATE_LIMIT`                         |
| Severity    | `MEDIUM`                             |
| HTTP Status | 429                                  |
| Retryable   | Yes                                  |

### Execution Errors

#### TimeoutError

Thrown when an operation exceeds its timeout.

```typescript
import { TimeoutError } from "@juspay/neurolink";

throw new TimeoutError(30000, "AI generation", "req-123");
```

| Property    | Value                    |
| ----------- | ------------------------ |
| Code        | `SERVER_ADAPTER_TIMEOUT` |
| Category    | `EXECUTION`              |
| Severity    | `MEDIUM`                 |
| HTTP Status | 408                      |
| Retryable   | Yes                      |

#### HandlerError

Thrown when a route handler fails during execution.

```typescript
import { HandlerError } from "@juspay/neurolink";

throw new HandlerError(
  "Failed to process request",
  originalError,
  "req-123",
  "/api/agent/execute",
  "POST",
);
```

| Property    | Value                          |
| ----------- | ------------------------------ |
| Code        | `SERVER_ADAPTER_HANDLER_ERROR` |
| Category    | `EXECUTION`                    |
| Severity    | `HIGH`                         |
| HTTP Status | 500                            |
| Retryable   | No                             |

### Streaming Errors

#### StreamingError

Thrown when a streaming operation fails.

```typescript
import { StreamingError } from "@juspay/neurolink";

throw new StreamingError("Stream write failed", originalError, "req-123");
```

| Property    | Value                         |
| ----------- | ----------------------------- |
| Code        | `SERVER_ADAPTER_STREAM_ERROR` |
| Category    | `STREAMING`                   |
| Severity    | `MEDIUM`                      |
| HTTP Status | 500                           |
| Retryable   | No                            |

#### StreamAbortedError

Thrown when a client aborts a streaming connection.

```typescript
import { StreamAbortedError } from "@juspay/neurolink";

throw new StreamAbortedError("Client disconnected", "req-123");
```

| Property    | Value                           |
| ----------- | ------------------------------- |
| Code        | `SERVER_ADAPTER_STREAM_ABORTED` |
| Category    | `STREAMING`                     |
| Severity    | `LOW`                           |
| HTTP Status | 499                             |
| Retryable   | No                              |

### WebSocket Errors

#### WebSocketError

General WebSocket operation errors.

```typescript
import { WebSocketError } from "@juspay/neurolink";

throw new WebSocketError("Message send failed", originalError, "ws-conn-123");
```

| Property    | Value                            |
| ----------- | -------------------------------- |
| Code        | `SERVER_ADAPTER_WEBSOCKET_ERROR` |
| Category    | `WEBSOCKET`                      |
| Severity    | `MEDIUM`                         |
| HTTP Status | 500                              |
| Retryable   | Yes                              |

#### WebSocketConnectionError

Thrown when WebSocket connection establishment fails.

```typescript
import { WebSocketConnectionError } from "@juspay/neurolink";

throw new WebSocketConnectionError("Handshake failed", originalError);
```

| Property    | Value                                        |
| ----------- | -------------------------------------------- |
| Code        | `SERVER_ADAPTER_WEBSOCKET_CONNECTION_FAILED` |
| Category    | `WEBSOCKET`                                  |
| Severity    | `HIGH`                                       |
| HTTP Status | 500                                          |
| Retryable   | Yes                                          |

### Server Lifecycle Errors

#### ServerStartError

Thrown when the server fails to start.

```typescript
import { ServerStartError } from "@juspay/neurolink";

throw new ServerStartError(
  "Port already in use",
  originalError,
  3000,
  "0.0.0.0",
);
```

| Property    | Value                         |
| ----------- | ----------------------------- |
| Code        | `SERVER_ADAPTER_START_FAILED` |
| Category    | `CONFIG`                      |
| Severity    | `CRITICAL`                    |
| HTTP Status | 500                           |
| Retryable   | Yes                           |

#### ServerStopError

Thrown when the server fails to stop cleanly.

```typescript
import { ServerStopError } from "@juspay/neurolink";

throw new ServerStopError("Failed to close connections", originalError);
```

| Property    | Value                        |
| ----------- | ---------------------------- |
| Code        | `SERVER_ADAPTER_STOP_FAILED` |
| Category    | `EXECUTION`                  |
| Severity    | `HIGH`                       |
| HTTP Status | 500                          |
| Retryable   | No                           |

#### AlreadyRunningError

Thrown when attempting to start an already running server.

```typescript
import { AlreadyRunningError } from "@juspay/neurolink";

throw new AlreadyRunningError(3000, "0.0.0.0");
```

| Property    | Value                            |
| ----------- | -------------------------------- |
| Code        | `SERVER_ADAPTER_ALREADY_RUNNING` |
| Category    | `CONFIG`                         |
| Severity    | `LOW`                            |
| HTTP Status | 500                              |
| Retryable   | No                               |

#### NotRunningError

Thrown when attempting to stop a server that is not running.

```typescript
import { NotRunningError } from "@juspay/neurolink";

throw new NotRunningError();
```

| Property    | Value                        |
| ----------- | ---------------------------- |
| Code        | `SERVER_ADAPTER_NOT_RUNNING` |
| Category    | `CONFIG`                     |
| Severity    | `LOW`                        |
| HTTP Status | 500                          |
| Retryable   | No                           |

#### ShutdownTimeoutError

Thrown when graceful shutdown exceeds the configured timeout.

```typescript
import { ShutdownTimeoutError } from "@juspay/neurolink";

throw new ShutdownTimeoutError(30000, 5); // 30s timeout, 5 remaining connections
```

| Property    | Value                        |
| ----------- | ---------------------------- |
| Code        | `SERVER_ADAPTER_STOP_FAILED` |
| Category    | `EXECUTION`                  |
| Severity    | `HIGH`                       |
| HTTP Status | 500                          |
| Retryable   | No                           |

#### DrainTimeoutError

Thrown when connection draining exceeds the configured timeout.

```typescript
import { DrainTimeoutError } from "@juspay/neurolink";

throw new DrainTimeoutError(10000, 3); // 10s timeout, 3 remaining connections
```

| Property    | Value                        |
| ----------- | ---------------------------- |
| Code        | `SERVER_ADAPTER_STOP_FAILED` |
| Category    | `EXECUTION`                  |
| Severity    | `MEDIUM`                     |
| HTTP Status | 500                          |
| Retryable   | No                           |

#### InvalidLifecycleStateError

Thrown when an operation is attempted in an invalid server state.

```typescript
import { InvalidLifecycleStateError } from "@juspay/neurolink";

throw new InvalidLifecycleStateError("start", "stopping", [
  "stopped",
  "initialized",
]);
```

| Property    | Value                                    |
| ----------- | ---------------------------------------- |
| Code        | `SERVER_ADAPTER_INVALID_LIFECYCLE_STATE` |
| Category    | `CONFIG`                                 |
| Severity    | `MEDIUM`                                 |
| HTTP Status | 500                                      |
| Retryable   | No                                       |

---

## HTTP Status Code Mapping

Errors automatically map to appropriate HTTP status codes:

| Error Code            | HTTP Status | Description           |
| --------------------- | ----------- | --------------------- |
| `VALIDATION_ERROR`    | 400         | Bad Request           |
| `SCHEMA_ERROR`        | 400         | Bad Request           |
| `INVALID_CONFIG`      | 400         | Bad Request           |
| `INVALID_ROUTE`       | 400         | Bad Request           |
| `AUTH_REQUIRED`       | 401         | Unauthorized          |
| `AUTH_INVALID`        | 401         | Unauthorized          |
| `FORBIDDEN`           | 403         | Forbidden             |
| `ROUTE_NOT_FOUND`     | 404         | Not Found             |
| `TIMEOUT`             | 408         | Request Timeout       |
| `RATE_LIMIT_EXCEEDED` | 429         | Too Many Requests     |
| `STREAM_ABORTED`      | 499         | Client Closed Request |
| All other errors      | 500         | Internal Server Error |

---

## Error Response Format

All errors are serialized to a consistent JSON format:

```json
{
  "error": {
    "code": "SERVER_ADAPTER_VALIDATION_ERROR",
    "message": "Validation failed: Invalid email format, Must be a positive number",
    "category": "VALIDATION",
    "requestId": "req-abc123",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "value": "not-an-email"
        },
        { "field": "age", "message": "Must be a positive number", "value": -5 }
      ]
    },
    "retryAfter": 60
  }
}
```

### Response Fields

| Field        | Type   | Description                                             |
| ------------ | ------ | ------------------------------------------------------- |
| `code`       | string | Unique error code for programmatic handling             |
| `message`    | string | Human-readable error message                            |
| `category`   | string | Error category for grouping                             |
| `requestId`  | string | Request ID for tracing (when available)                 |
| `details`    | object | Additional context-specific information                 |
| `retryAfter` | number | Suggested retry delay in seconds (for retryable errors) |

---

## Recovery Strategies

Each error category has a predefined recovery strategy:

```typescript
const ErrorRecoveryStrategies = {
  CONFIG: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  VALIDATION: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  EXECUTION: {
    strategy: "retry",
    maxRetries: 3,
    baseDelayMs: 1000,
  },
  EXTERNAL: {
    strategy: "exponentialBackoff",
    maxRetries: 5,
    baseDelayMs: 1000,
  },
  RATE_LIMIT: {
    strategy: "exponentialBackoff",
    maxRetries: 3,
    baseDelayMs: 5000,
  },
  AUTHENTICATION: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  AUTHORIZATION: {
    strategy: "fail",
    maxRetries: 0,
    baseDelayMs: 0,
  },
  STREAMING: {
    strategy: "retry",
    maxRetries: 2,
    baseDelayMs: 500,
  },
  WEBSOCKET: {
    strategy: "exponentialBackoff",
    maxRetries: 5,
    baseDelayMs: 1000,
  },
};
```

### Strategy Types

| Strategy             | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `fail`               | Fail immediately without retry                                   |
| `retry`              | Retry with fixed delay between attempts                          |
| `exponentialBackoff` | Retry with exponentially increasing delays (1s, 2s, 4s, 8s, ...) |

---

## Custom Error Handling

### Global Error Handler

Register a global error handler for custom error processing:

```typescript
import { createServer, ServerAdapterError, wrapError } from "@juspay/neurolink";

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

// Register global error handler
server.onError((error, context) => {
  // Wrap unknown errors
  const serverError =
    error instanceof ServerAdapterError
      ? error
      : wrapError(error, context.requestId, context.path, context.method);

  // Log based on severity
  if (serverError.severity === "CRITICAL") {
    alertOps(serverError);
  }

  if (serverError.severity === "HIGH" || serverError.severity === "CRITICAL") {
    logger.error("Server error", {
      code: serverError.code,
      message: serverError.message,
      requestId: serverError.requestId,
      path: serverError.path,
      stack: serverError.stack,
    });
  }

  // Track metrics
  metrics.increment("server.errors", {
    code: serverError.code,
    category: serverError.category,
    severity: serverError.severity,
  });

  // Return the error (will be serialized to JSON response)
  return serverError;
});
```

### Route-Level Error Handling

Handle errors in specific routes:

```typescript
server.registerRoute({
  method: "POST",
  path: "/api/custom",
  handler: async (ctx) => {
    try {
      const result = await processRequest(ctx.body);
      return result;
    } catch (error) {
      // Transform domain errors to server errors
      if (error instanceof DomainValidationError) {
        throw new ValidationError(
          [{ field: error.field, message: error.message }],
          ctx.requestId,
        );
      }

      if (error instanceof ExternalServiceError) {
        throw new HandlerError(
          "External service unavailable",
          error,
          ctx.requestId,
          ctx.path,
          ctx.method,
        );
      }

      // Re-throw server adapter errors
      throw error;
    }
  },
});
```

### Using wrapError Helper

The `wrapError` utility converts unknown errors to `ServerAdapterError`:

```typescript
import { wrapError, ServerAdapterError } from "@juspay/neurolink";

function handleError(error: unknown, requestId: string): ServerAdapterError {
  // Already a ServerAdapterError - return as-is
  if (error instanceof ServerAdapterError) {
    return error;
  }

  // Wrap as HandlerError
  return wrapError(error, requestId, "/api/endpoint", "POST");
}
```

### Implementing Retry Logic

Use recovery strategies for automatic retry:

```typescript
import { ErrorRecoveryStrategies, ServerAdapterError } from "@juspay/neurolink";

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  category: string,
): Promise<T> {
  const strategy = ErrorRecoveryStrategies[category];
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if strategy is "fail"
      if (strategy.strategy === "fail") {
        throw error;
      }

      // Check if error is retryable
      if (error instanceof ServerAdapterError && !error.retryable) {
        throw error;
      }

      // Calculate delay
      const delay =
        strategy.strategy === "exponentialBackoff"
          ? strategy.baseDelayMs * Math.pow(2, attempt)
          : strategy.baseDelayMs;

      // Use retryAfterMs if provided
      const actualDelay =
        error instanceof ServerAdapterError && error.retryAfterMs
          ? error.retryAfterMs
          : delay;

      if (attempt < strategy.maxRetries) {
        await sleep(actualDelay);
      }
    }
  }

  throw lastError;
}
```

---

## Error Codes Reference

### Configuration Errors

| Code                                   | Description                             |
| -------------------------------------- | --------------------------------------- |
| `SERVER_ADAPTER_INVALID_CONFIG`        | Invalid server configuration            |
| `SERVER_ADAPTER_MISSING_DEPENDENCY`    | Required framework dependency not found |
| `SERVER_ADAPTER_FRAMEWORK_INIT_FAILED` | Framework initialization failed         |

### Route Errors

| Code                             | Description                         |
| -------------------------------- | ----------------------------------- |
| `SERVER_ADAPTER_ROUTE_NOT_FOUND` | Requested route does not exist      |
| `SERVER_ADAPTER_ROUTE_CONFLICT`  | Route conflicts with existing route |
| `SERVER_ADAPTER_INVALID_ROUTE`   | Invalid route definition            |

### Execution Errors

| Code                              | Description                    |
| --------------------------------- | ------------------------------ |
| `SERVER_ADAPTER_HANDLER_ERROR`    | Route handler execution failed |
| `SERVER_ADAPTER_TIMEOUT`          | Operation timed out            |
| `SERVER_ADAPTER_MIDDLEWARE_ERROR` | Middleware execution failed    |

### Authentication/Authorization Errors

| Code                           | Description                              |
| ------------------------------ | ---------------------------------------- |
| `SERVER_ADAPTER_AUTH_REQUIRED` | Authentication required but not provided |
| `SERVER_ADAPTER_AUTH_INVALID`  | Invalid authentication credentials       |
| `SERVER_ADAPTER_FORBIDDEN`     | Access denied (insufficient permissions) |

### Rate Limiting Errors

| Code                                 | Description                 |
| ------------------------------------ | --------------------------- |
| `SERVER_ADAPTER_RATE_LIMIT_EXCEEDED` | Request rate limit exceeded |

### Streaming Errors

| Code                            | Description                |
| ------------------------------- | -------------------------- |
| `SERVER_ADAPTER_STREAM_ERROR`   | Streaming operation failed |
| `SERVER_ADAPTER_STREAM_ABORTED` | Client aborted the stream  |

### WebSocket Errors

| Code                                         | Description                 |
| -------------------------------------------- | --------------------------- |
| `SERVER_ADAPTER_WEBSOCKET_ERROR`             | WebSocket operation failed  |
| `SERVER_ADAPTER_WEBSOCKET_CONNECTION_FAILED` | WebSocket connection failed |

### Validation Errors

| Code                              | Description               |
| --------------------------------- | ------------------------- |
| `SERVER_ADAPTER_VALIDATION_ERROR` | Request validation failed |
| `SERVER_ADAPTER_SCHEMA_ERROR`     | Schema validation failed  |

### Lifecycle Errors

| Code                             | Description               |
| -------------------------------- | ------------------------- |
| `SERVER_ADAPTER_START_FAILED`    | Server failed to start    |
| `SERVER_ADAPTER_STOP_FAILED`     | Server failed to stop     |
| `SERVER_ADAPTER_ALREADY_RUNNING` | Server is already running |
| `SERVER_ADAPTER_NOT_RUNNING`     | Server is not running     |

---

## Best Practices

### 1. Use Specific Error Classes

Throw the most specific error class for your situation:

```typescript
// Good - specific error with context
throw new ValidationError(
  [{ field: "email", message: "Invalid format" }],
  requestId,
);

// Avoid - generic error
throw new Error("Validation failed");
```

### 2. Include Request Context

Always include request ID, path, and method when available:

```typescript
throw new HandlerError(
  "Processing failed",
  cause,
  context.requestId, // For tracing
  context.path, // For debugging
  context.method, // For debugging
);
```

### 3. Provide Actionable Details

Include details that help diagnose the issue:

```typescript
throw new ConfigurationError("Invalid rate limit configuration", {
  field: "maxRequests",
  provided: -100,
  expected: "positive integer",
  hint: "maxRequests must be greater than 0",
});
```

### 4. Respect Retry-After Headers

When handling `RateLimitError`, honor the `retryAfterMs`:

```typescript
if (error instanceof RateLimitError) {
  response.setHeader("Retry-After", Math.ceil(error.retryAfterMs / 1000));
}
```

### 5. Log Appropriately by Severity

```typescript
switch (error.severity) {
  case "CRITICAL":
    logger.fatal(error);
    alertOps(error);
    break;
  case "HIGH":
    logger.error(error);
    break;
  case "MEDIUM":
    logger.warn(error);
    break;
  case "LOW":
    logger.info(error);
    break;
}
```

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Security Best Practices](./security.md)** - Authentication and authorization
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options
- **[Deployment Guide](./deployment.md)** - Production deployment strategies
