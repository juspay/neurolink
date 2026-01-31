---
title: Error Code Reference
description: Complete reference for all NeuroLink error codes with categories, solutions, and debugging guidance
keywords: errors, error codes, debugging, troubleshooting, error handling
---

# Error Code Reference

This document provides a comprehensive reference for all NeuroLink error codes, including their categories, severity levels, retriability status, and resolution guidance.

## Overview

NeuroLink uses a structured error handling system that provides detailed information about failures. Each error includes:

| Property    | Description                                             |
| ----------- | ------------------------------------------------------- |
| `code`      | Unique identifier for the error type                    |
| `category`  | Classification of the error (validation, network, etc.) |
| `severity`  | Impact level (critical, high, medium, low)              |
| `retriable` | Whether the operation can be automatically retried      |
| `message`   | Human-readable description of the error                 |
| `context`   | Additional metadata about the error circumstances       |
| `timestamp` | When the error occurred                                 |

## Error Categories

NeuroLink classifies errors into the following categories:

| Category        | Description                         | Common Causes                                            |
| --------------- | ----------------------------------- | -------------------------------------------------------- |
| `VALIDATION`    | Invalid parameters or configuration | Malformed input, missing required fields, invalid values |
| `EXECUTION`     | Runtime execution failures          | Tool execution errors, provider API failures             |
| `NETWORK`       | Connectivity issues                 | DNS failures, connection timeouts, SSL errors            |
| `RESOURCE`      | Memory or quota exhaustion          | Out of memory, rate limits exceeded                      |
| `TIMEOUT`       | Operation timeouts                  | Slow provider response, long-running operations          |
| `PERMISSION`    | Authorization issues                | Invalid API keys, insufficient permissions               |
| `CONFIGURATION` | Configuration errors                | Missing environment variables, invalid config            |
| `SYSTEM`        | System-level failures               | Internal errors, unexpected states                       |

## Severity Levels

Errors are classified by severity to help prioritize response:

| Severity   | Description                                        | Action Required                           |
| ---------- | -------------------------------------------------- | ----------------------------------------- |
| `CRITICAL` | System-level failure requiring immediate attention | Stop operation, investigate immediately   |
| `HIGH`     | Operation failed, significant impact               | Retry if possible, escalate if persistent |
| `MEDIUM`   | Validation or recoverable issues                   | Review parameters, fix and retry          |
| `LOW`      | Minor issues, informational                        | Log for monitoring, continue operation    |

## Tool Errors

Errors related to tool registration, discovery, and execution.

| Code                     | Description                          | Severity | Retriable | Category   |
| ------------------------ | ------------------------------------ | -------- | --------- | ---------- |
| `TOOL_NOT_FOUND`         | Requested tool not found in registry | MEDIUM   | No        | VALIDATION |
| `TOOL_EXECUTION_FAILED`  | Tool execution encountered an error  | HIGH     | Yes       | EXECUTION  |
| `TOOL_TIMEOUT`           | Tool execution timed out             | HIGH     | Yes       | TIMEOUT    |
| `TOOL_VALIDATION_FAILED` | Tool parameter validation failed     | MEDIUM   | No        | VALIDATION |

### Resolution Guide

**TOOL_NOT_FOUND**

```typescript
// Check available tools before calling
const tools = await neurolink.listTools();
console.log(
  "Available tools:",
  tools.map((t) => t.name),
);

// Verify tool registration
await neurolink.addTool({
  name: "myTool",
  description: "My custom tool",
  parameters: {
    /* schema */
  },
  execute: async (params) => {
    /* implementation */
  },
});
```

**TOOL_EXECUTION_FAILED**

```typescript
// Check tool parameters match expected schema
// Review tool implementation for errors
// Verify external dependencies (APIs, databases) are available
```

**TOOL_TIMEOUT**

```typescript
// Increase timeout configuration
const result = await neurolink.generate({
  input: { text: "Use the slow tool" },
  toolTimeout: 60000, // 60 seconds
});
```

## Provider Errors

Errors related to AI provider communication and authentication.

| Code                      | Description                           | Severity | Retriable | Category   |
| ------------------------- | ------------------------------------- | -------- | --------- | ---------- |
| `PROVIDER_NOT_AVAILABLE`  | Provider service unavailable          | HIGH     | Yes       | NETWORK    |
| `PROVIDER_AUTH_FAILED`    | Provider authentication failed        | HIGH     | No        | PERMISSION |
| `PROVIDER_QUOTA_EXCEEDED` | Provider rate limit or quota exceeded | HIGH     | Yes       | RESOURCE   |

### Resolution Guide

**PROVIDER_NOT_AVAILABLE**

```typescript
// Configure automatic failover
const neurolink = new NeuroLink({
  provider: "openai",
  fallbackProviders: ["anthropic", "google-ai"],
});

// Or manually switch providers
await neurolink.setProvider("anthropic");
```

**PROVIDER_AUTH_FAILED**

```typescript
// Verify API key is set correctly
process.env.OPENAI_API_KEY = "sk-...";

// Check API key permissions and validity
// Ensure correct environment variables for your provider
```

**PROVIDER_QUOTA_EXCEEDED**

```typescript
// Implement exponential backoff
import { withRetry } from "@juspay/neurolink";

const result = await withRetry(
  () => neurolink.generate({ input: { text: "Hello" } }),
  { maxAttempts: 3, delayMs: 1000 },
);
```

## Video Validation Errors

Errors specific to video generation operations.

| Code                         | Description                   | Severity | Retriable | Category   |
| ---------------------------- | ----------------------------- | -------- | --------- | ---------- |
| `INVALID_VIDEO_RESOLUTION`   | Invalid resolution specified  | MEDIUM   | No        | VALIDATION |
| `INVALID_VIDEO_LENGTH`       | Invalid video duration        | MEDIUM   | No        | VALIDATION |
| `INVALID_VIDEO_ASPECT_RATIO` | Invalid aspect ratio          | MEDIUM   | No        | VALIDATION |
| `INVALID_VIDEO_AUDIO`        | Invalid audio option          | MEDIUM   | No        | VALIDATION |
| `INVALID_VIDEO_MODE`         | Output mode not set to video  | MEDIUM   | No        | VALIDATION |
| `MISSING_VIDEO_IMAGE`        | Required input image missing  | MEDIUM   | No        | VALIDATION |
| `EMPTY_VIDEO_PROMPT`         | Video prompt cannot be empty  | MEDIUM   | No        | VALIDATION |
| `VIDEO_PROMPT_TOO_LONG`      | Prompt exceeds maximum length | MEDIUM   | No        | VALIDATION |

### Resolution Guide

**INVALID_VIDEO_RESOLUTION**

```typescript
// Valid resolutions: '720p' or '1080p'
const result = await neurolink.generate({
  input: { text: "Camera pan", images: [imageBuffer] },
  output: {
    mode: "video",
    video: { resolution: "720p" }, // or '1080p'
  },
});
```

**INVALID_VIDEO_LENGTH**

```typescript
// Valid lengths: 4, 6, or 8 seconds
const result = await neurolink.generate({
  input: { text: "Smooth motion", images: [imageBuffer] },
  output: {
    mode: "video",
    video: { length: 6 }, // 4, 6, or 8
  },
});
```

**INVALID_VIDEO_ASPECT_RATIO**

```typescript
// Valid aspect ratios: '9:16' (portrait) or '16:9' (landscape)
const result = await neurolink.generate({
  input: { text: "Cinematic shot", images: [imageBuffer] },
  output: {
    mode: "video",
    video: { aspectRatio: "16:9" },
  },
});
```

**MISSING_VIDEO_IMAGE**

```typescript
// Video generation requires an input image
import { readFileSync } from "fs";

const imageBuffer = readFileSync("./input.png");
const result = await neurolink.generate({
  input: {
    text: "Animate this image with smooth motion",
    images: [imageBuffer],
  },
  output: { mode: "video" },
});
```

## Image Validation Errors

Errors specific to image input processing.

| Code                   | Description                        | Severity | Retriable | Category   |
| ---------------------- | ---------------------------------- | -------- | --------- | ---------- |
| `EMPTY_IMAGE_PATH`     | Image path or URL is empty         | MEDIUM   | No        | VALIDATION |
| `INVALID_IMAGE_TYPE`   | Image must be Buffer, path, or URL | MEDIUM   | No        | VALIDATION |
| `IMAGE_TOO_LARGE`      | Image exceeds maximum size         | MEDIUM   | No        | VALIDATION |
| `IMAGE_TOO_SMALL`      | Image data too small to be valid   | MEDIUM   | No        | VALIDATION |
| `INVALID_IMAGE_FORMAT` | Unsupported image format           | MEDIUM   | No        | VALIDATION |

### Resolution Guide

**IMAGE_TOO_LARGE**

```typescript
// Compress or resize images before sending
import sharp from "sharp";

const compressedImage = await sharp(originalImage)
  .resize(1920, 1080, { fit: "inside" })
  .jpeg({ quality: 80 })
  .toBuffer();
```

**INVALID_IMAGE_FORMAT**

```typescript
// Supported formats: JPEG, PNG, WebP
// Convert unsupported formats before processing
import sharp from "sharp";

const jpegBuffer = await sharp(bmpImage).jpeg().toBuffer();
```

## System and Configuration Errors

General system and configuration errors.

| Code                     | Description                     | Severity | Retriable | Category      |
| ------------------------ | ------------------------------- | -------- | --------- | ------------- |
| `MEMORY_EXHAUSTED`       | System memory exhausted         | CRITICAL | No        | RESOURCE      |
| `NETWORK_ERROR`          | Network connectivity issue      | HIGH     | Yes       | NETWORK       |
| `PERMISSION_DENIED`      | Operation not permitted         | HIGH     | No        | PERMISSION    |
| `INVALID_CONFIGURATION`  | Configuration is invalid        | MEDIUM   | No        | CONFIGURATION |
| `MISSING_CONFIGURATION`  | Required configuration missing  | MEDIUM   | No        | CONFIGURATION |
| `INVALID_PARAMETERS`     | Parameters failed validation    | MEDIUM   | No        | VALIDATION    |
| `MISSING_REQUIRED_PARAM` | Required parameter not provided | MEDIUM   | No        | VALIDATION    |

### Resolution Guide

**MEMORY_EXHAUSTED**

```typescript
// Process large files in chunks
// Increase Node.js heap size: node --max-old-space-size=4096
// Use streaming for large responses
```

**MISSING_CONFIGURATION**

```typescript
// Verify all required environment variables are set
// Required variables depend on your provider:
// - OPENAI_API_KEY for OpenAI
// - ANTHROPIC_API_KEY for Anthropic
// - GOOGLE_API_KEY for Google AI Studio
// - GOOGLE_APPLICATION_CREDENTIALS for Vertex AI

// Validate configuration
import { validateConfig } from "@juspay/neurolink";
await validateConfig();
```

## Video Generation Runtime Errors

Runtime errors during video generation (as opposed to validation errors).

| Code                            | Description                               | Severity | Retriable | Category      |
| ------------------------------- | ----------------------------------------- | -------- | --------- | ------------- |
| `VIDEO_GENERATION_FAILED`       | Video generation API call failed          | HIGH     | Yes       | EXECUTION     |
| `VIDEO_PROVIDER_NOT_CONFIGURED` | Vertex AI not properly configured         | HIGH     | No        | CONFIGURATION |
| `VIDEO_POLL_TIMEOUT`            | Polling for video completion timed out    | HIGH     | Yes       | TIMEOUT       |
| `VIDEO_INVALID_INPUT`           | Runtime I/O error during input processing | HIGH     | Yes       | EXECUTION     |

### Resolution Guide

**VIDEO_PROVIDER_NOT_CONFIGURED**

```bash
# Set Google Cloud credentials for Vertex AI video generation
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GOOGLE_VERTEX_PROJECT=your-project-id
export GOOGLE_VERTEX_LOCATION=us-central1
```

**VIDEO_POLL_TIMEOUT**

```typescript
// Video generation typically takes 1-3 minutes
// Consider using shorter duration or lower resolution for faster results
const result = await neurolink.generate({
  input: { text: "Quick animation", images: [imageBuffer] },
  output: {
    mode: "video",
    video: {
      resolution: "720p", // Lower resolution is faster
      length: 4, // Shorter duration is faster
    },
  },
});
```

## SDK Error Handling Example

Complete example demonstrating proper error handling in the SDK:

```typescript
import {
  NeuroLink,
  NeuroLinkError,
  ErrorCategory,
  withRetry,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ provider: "openai" });

async function safeGenerate(prompt: string) {
  try {
    const result = await neurolink.generate({
      input: { text: prompt },
    });
    return result;
  } catch (error) {
    if (error instanceof NeuroLinkError) {
      // Access structured error information
      console.error(`Error Code: ${error.code}`);
      console.error(`Category: ${error.category}`);
      console.error(`Severity: ${error.severity}`);
      console.error(`Retriable: ${error.retriable}`);
      console.error(`Message: ${error.message}`);
      console.error(`Context:`, error.context);

      // Handle by category
      switch (error.category) {
        case ErrorCategory.VALIDATION:
          console.error("Fix input parameters and retry");
          break;
        case ErrorCategory.NETWORK:
          if (error.retriable) {
            console.error("Network issue - retrying...");
            return withRetry(
              () => neurolink.generate({ input: { text: prompt } }),
              { maxAttempts: 3, delayMs: 2000 },
            );
          }
          break;
        case ErrorCategory.PERMISSION:
          console.error("Check API key and permissions");
          break;
        case ErrorCategory.RESOURCE:
          console.error("Rate limited - waiting before retry");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return safeGenerate(prompt);
        default:
          console.error("Unexpected error");
      }

      // Log error in JSON format for structured logging
      console.error("Structured error:", error.toJSON());
    }
    throw error;
  }
}
```

## CLI Debugging

The CLI provides several options for debugging errors:

### Enable Debug Mode

```bash
# Run with debug output
neurolink generate "test prompt" --debug

# Show verbose output
neurolink status --verbose

# Validate configuration
neurolink config validate

# Check provider status
neurolink provider status openai
```

### Environment Validation

```bash
# Validate all environment variables
pnpm run env:validate

# Check specific provider configuration
neurolink config check --provider openai
```

### Debug Logging

```typescript
// Enable debug logging in SDK
import { setLogLevel } from "@juspay/neurolink";

setLogLevel("debug");

// Or via environment variable
process.env.NEUROLINK_LOG_LEVEL = "debug";
```

## Retry Utilities

NeuroLink provides built-in utilities for handling retriable errors:

### withRetry

```typescript
import { withRetry, isRetriableError } from "@juspay/neurolink";

const result = await withRetry(
  () => neurolink.generate({ input: { text: "Hello" } }),
  {
    maxAttempts: 3,
    delayMs: 1000,
    isRetriable: isRetriableError,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    },
  },
);
```

### withTimeout

```typescript
import { withTimeout } from "@juspay/neurolink";

const result = await withTimeout(
  neurolink.generate({ input: { text: "Hello" } }),
  30000, // 30 second timeout
  new Error("Generation timed out"),
);
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from "@juspay/neurolink";

const breaker = new CircuitBreaker(5, 60000); // 5 failures, 60s reset

const result = await breaker.execute(() =>
  neurolink.generate({ input: { text: "Hello" } }),
);

// Check circuit state
console.log("Circuit state:", breaker.getState()); // closed, open, half-open
console.log("Failure count:", breaker.getFailureCount());
```

## Provider-Specific Error Codes

Some providers have additional error codes:

### SageMaker Errors

| Code                  | Description                     | HTTP Status | Retriable |
| --------------------- | ------------------------------- | ----------- | --------- |
| `VALIDATION_ERROR`    | Request validation failed       | 400         | No        |
| `MODEL_ERROR`         | Model execution error           | 500         | No        |
| `INTERNAL_ERROR`      | Internal service error          | 500         | Yes       |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503         | Yes       |
| `THROTTLING_ERROR`    | Rate limit exceeded             | 429         | Yes       |
| `CREDENTIALS_ERROR`   | AWS credentials invalid         | 401         | No        |
| `NETWORK_ERROR`       | Network connectivity issue      | -           | Yes       |
| `ENDPOINT_NOT_FOUND`  | SageMaker endpoint not found    | 404         | No        |
| `UNKNOWN_ERROR`       | Unclassified error              | 500         | No        |

## Related Documentation

- [Troubleshooting Guide](/docs/reference/troubleshooting.md) - Common issues and solutions
- [Configuration Reference](/docs/reference/configuration.md) - Environment variables and settings
- [FAQ](/docs/reference/faq.md) - Frequently asked questions
- [Provider Feature Compatibility](/docs/reference/provider-feature-compatibility.md) - Provider capabilities matrix
