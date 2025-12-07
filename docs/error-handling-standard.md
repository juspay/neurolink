# Error Handling Standard

This document defines the standardized error handling approach for NeuroLink.

## Overview

NeuroLink uses a comprehensive, structured error handling system that provides:

- **Standardized error codes**: 60+ predefined error codes across 10 categories
- **Consistent format**: All errors follow the same structure
- **Rich metadata**: Category, severity, retriability, HTTP status codes
- **Programmatic handling**: Easy to catch and handle specific error types
- **Human-readable messages**: Clear, actionable error messages

## Error Code Categories

Error codes follow the format `CATEGORY_DESCRIPTION` and are organized into categories:

| Category   | Prefix         | Description                  | Examples                                                   |
| ---------- | -------------- | ---------------------------- | ---------------------------------------------------------- |
| Tool       | `TOOL_*`       | Tool execution and discovery | `TOOL_NOT_FOUND`, `TOOL_EXECUTION_FAILED`                  |
| Provider   | `PROVIDER_*`   | AI provider operations       | `PROVIDER_AUTH_FAILED`, `PROVIDER_RATE_LIMIT`              |
| Network    | `NETWORK_*`    | Network connectivity         | `NETWORK_TIMEOUT`, `NETWORK_ERROR`                         |
| Auth       | `AUTH_*`       | Authentication/authorization | `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`           |
| Validation | `VALIDATION_*` | Input validation             | `VALIDATION_INVALID_PARAMETERS`, `VALIDATION_SCHEMA_ERROR` |
| Config     | `CONFIG_*`     | Configuration                | `CONFIG_MISSING`, `CONFIG_INVALID`                         |
| MCP        | `MCP_*`        | MCP protocol                 | `MCP_SERVER_NOT_FOUND`, `MCP_CLIENT_CREATION_FAILED`       |
| HITL       | `HITL_*`       | Human-in-the-loop            | `HITL_USER_REJECTED`, `HITL_TIMEOUT`                       |
| System     | `SYSTEM_*`     | System-level errors          | `SYSTEM_INTERNAL_ERROR`, `SYSTEM_TIMEOUT`                  |
| Memory     | `MEMORY_*`     | Memory management            | `MEMORY_EXHAUSTED`, `MEMORY_STORAGE_FAILED`                |

## Error Structure

All errors extend `NeuroLinkError` and have the following structure:

```typescript
{
  code: ErrorCode;              // Standardized error code
  message: string;              // Human-readable message
  category: ErrorCategory;      // Error category (validation, execution, etc.)
  severity: ErrorSeverity;      // Severity level (low, medium, high, critical)
  retriable: boolean;           // Whether the operation can be retried
  httpStatusCode?: number;      // HTTP status code (if applicable)
  timestamp: Date;              // When the error occurred
  context: Record<string, unknown>;  // Additional context
  toolName?: string;            // Tool name (if applicable)
  serverId?: string;            // Server ID (if applicable)
  provider?: string;            // Provider name (if applicable)
}
```

## Creating Errors

### Using ErrorFactory (Recommended)

The `ErrorFactory` provides convenient methods for common error scenarios:

```typescript
import { ErrorFactory } from "./lib/utils/errorHandling.js";

// Tool errors
throw ErrorFactory.toolNotFound("myTool", ["tool1", "tool2"]);
throw ErrorFactory.toolExecutionFailed("myTool", originalError);
throw ErrorFactory.toolTimeout("myTool", 5000);

// Provider errors
throw ErrorFactory.providerAuthFailed("openai", "Invalid API key");
throw ErrorFactory.providerNotFound("unknown-provider");
throw ErrorFactory.providerRateLimit("openai", 60);

// Network errors
throw ErrorFactory.networkError("Connection failed", originalError);

// MCP errors
throw ErrorFactory.mcpServerNotFound("github");
throw ErrorFactory.mcpServerConnectionFailed("github", originalError);

// Configuration errors
throw ErrorFactory.configInvalid("Invalid value", "apiKey", "***");
throw ErrorFactory.configMissing("apiKey");

// Validation errors
throw ErrorFactory.validationError("Must be positive", "count", -5);

// HITL errors
throw ErrorFactory.hitlUserRejected("dangerousTool", "Too risky");
throw ErrorFactory.hitlTimeout("confirmTool", 30000);

// Generic errors
throw ErrorFactory.systemError("Internal error", originalError);
```

### Using NeuroLinkError Directly

For custom scenarios, create errors directly:

```typescript
import { NeuroLinkError, ERROR_CODES } from "./lib/utils/errorHandling.js";

throw new NeuroLinkError({
  code: ERROR_CODES.CUSTOM_ERROR,
  message: "Custom error message",
  context: { customField: "value" },
  provider: "my-provider",
});
```

The error will automatically use metadata from `ERROR_CODE_METADATA` including:

- Category
- Severity
- Retriability
- HTTP status code

You can override these if needed:

```typescript
throw new NeuroLinkError({
  code: ERROR_CODES.TOOL_NOT_FOUND,
  message: "Tool not found",
  severity: ErrorSeverity.CRITICAL, // Override default severity
  retriable: true, // Override default retriability
});
```

## Error Metadata

Each error code has associated metadata that defines its behavior:

```typescript
import { ERROR_CODE_METADATA } from "./lib/constants/errorCodes.js";

const metadata = ERROR_CODE_METADATA[ERROR_CODES.NETWORK_TIMEOUT];
// {
//   code: "NETWORK_TIMEOUT",
//   category: "timeout",
//   retriable: true,
//   severity: "high",
//   httpStatusCode: 408
// }
```

## Handling Errors

### Catching Specific Error Types

```typescript
import { NeuroLinkError, ERROR_CODES } from "./lib/utils/errorHandling.js";

try {
  await somOperation();
} catch (error) {
  if (error instanceof NeuroLinkError) {
    // Check error code
    if (error.code === ERROR_CODES.NETWORK_TIMEOUT) {
      // Handle timeout
      console.log("Operation timed out, retrying...");
    }

    // Check if retriable
    if (error.shouldRetry()) {
      // Retry logic
    }

    // Check severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Alert or escalate
    }
  }
}
```

### Using Error Context

```typescript
try {
  await executeToolkitTool("myTool", params);
} catch (error) {
  if (error instanceof NeuroLinkError) {
    console.log("Error code:", error.code);
    console.log("Tool name:", error.toolName);
    console.log("Available tools:", error.context.availableTools);
    console.log("Formatted:", error.getFormattedMessage());
  }
}
```

### Retry Logic

```typescript
import { withRetry, isRetriableError } from "./lib/utils/errorHandling.js";

const result = await withRetry(() => callProvider(), {
  maxAttempts: 3,
  delayMs: 1000,
  isRetriable: isRetriableError, // Uses error metadata
  onRetry: (attempt, error) => {
    console.log(`Retry attempt ${attempt}:`, error.message);
  },
});
```

## Error Formatting

### Display Format

Use `getFormattedMessage()` for display:

```typescript
const error = ErrorFactory.providerAuthFailed("openai", "Invalid key");
console.log(error.getFormattedMessage());
// Output: [CRITICAL] [openai] [PROVIDER_AUTH_FAILED] Authentication failed for provider 'openai': Invalid key
```

### JSON Serialization

For logging or API responses:

```typescript
const error = ErrorFactory.toolNotFound("myTool");
console.log(JSON.stringify(error.toJSON(), null, 2));
// {
//   "code": "TOOL_NOT_FOUND",
//   "message": "Tool 'myTool' not found",
//   "category": "validation",
//   "severity": "medium",
//   "retriable": false,
//   "httpStatusCode": 404,
//   "timestamp": "2025-12-02T14:30:00.000Z",
//   "context": { "toolName": "myTool" }
// }
```

## Migration from Legacy Errors

Legacy error classes are still supported but deprecated:

| Legacy Class            | New Approach                             |
| ----------------------- | ---------------------------------------- |
| `ProviderError`         | `NeuroLinkError` with `PROVIDER_*` codes |
| `AuthenticationError`   | `ErrorFactory.providerAuthFailed()`      |
| `NetworkError`          | `ErrorFactory.networkError()`            |
| `RateLimitError`        | `ErrorFactory.providerRateLimit()`       |
| `HITLUserRejectedError` | `ErrorFactory.hitlUserRejected()`        |
| `HITLTimeoutError`      | `ErrorFactory.hitlTimeout()`             |
| `SageMakerError`        | `NeuroLinkError` with `PROVIDER_*` codes |

### Migration Example

**Before:**

```typescript
throw new AuthenticationError("Invalid API key", "openai");
```

**After:**

```typescript
throw ErrorFactory.providerAuthFailed("openai", "Invalid API key");
```

## Best Practices

1. **Use ErrorFactory**: Prefer factory methods over direct construction
2. **Include Context**: Add relevant context for debugging
3. **Preserve Original Errors**: Pass `originalError` when wrapping
4. **Check Retriability**: Use `shouldRetry()` for retry logic
5. **Log Structured Data**: Use `toJSON()` for structured logging
6. **Use Appropriate Codes**: Choose the most specific error code
7. **Add HTTP Status**: Include `httpStatusCode` for API responses

## Examples

### Provider Error with Retry

```typescript
import { ErrorFactory, withRetry } from "./lib/utils/errorHandling.js";

async function callProvider() {
  try {
    const result = await provider.generate(params);
    return result;
  } catch (error) {
    if (error.status === 429) {
      throw ErrorFactory.providerRateLimit("openai", 60);
    }
    throw ErrorFactory.systemError("Provider call failed", error);
  }
}

// Use with retry
const result = await withRetry(callProvider, { maxAttempts: 3, delayMs: 1000 });
```

### Tool Execution with Context

```typescript
async function executeTool(toolName: string, params: unknown) {
  const tool = registry.getTool(toolName);

  if (!tool) {
    throw ErrorFactory.toolNotFound(
      toolName,
      registry.getAllToolNames(), // Add available tools for context
    );
  }

  try {
    return await tool.execute(params);
  } catch (error) {
    throw ErrorFactory.toolExecutionFailed(
      toolName,
      error instanceof Error ? error : new Error(String(error)),
      "server-id",
    );
  }
}
```

### Configuration Validation

```typescript
function validateConfig(config: Config) {
  if (!config.apiKey) {
    throw ErrorFactory.configMissing("apiKey");
  }

  if (config.timeout < 0) {
    throw ErrorFactory.configInvalid(
      "Timeout must be positive",
      "timeout",
      config.timeout,
    );
  }
}
```

## Testing

Test error handling thoroughly:

```typescript
import { describe, it, expect } from "vitest";
import { ErrorFactory, ERROR_CODES } from "./lib/utils/errorHandling.js";

describe("Error Handling", () => {
  it("should create correct error with context", () => {
    const error = ErrorFactory.toolNotFound("myTool", ["tool1", "tool2"]);

    expect(error.code).toBe(ERROR_CODES.TOOL_NOT_FOUND);
    expect(error.toolName).toBe("myTool");
    expect(error.context.availableTools).toEqual(["tool1", "tool2"]);
    expect(error.shouldRetry()).toBe(false);
  });

  it("should format error message correctly", () => {
    const error = ErrorFactory.providerAuthFailed("openai", "Invalid key");
    const formatted = error.getFormattedMessage();

    expect(formatted).toContain("[openai]");
    expect(formatted).toContain("PROVIDER_AUTH_FAILED");
  });
});
```

## Summary

The standardized error handling system provides:

✅ **Consistency**: All errors follow the same structure  
✅ **Clarity**: Clear, actionable error messages  
✅ **Context**: Rich metadata for debugging  
✅ **Automation**: Programmatic error handling  
✅ **Reliability**: Built-in retry logic  
✅ **Observability**: Structured logging support

For questions or contributions, see the main [CONTRIBUTING.md](../CONTRIBUTING.md).
