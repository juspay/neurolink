---
title: "Observability Guide"
description: Enterprise-grade observability for AI operations with Langfuse and OpenTelemetry integration
keywords:
  [
    observability,
    langfuse,
    opentelemetry,
    tracing,
    monitoring,
    telemetry,
    distributed-tracing,
  ]
---

# Observability Guide

Enterprise-grade observability for AI operations with Langfuse and OpenTelemetry integration.

## Overview

NeuroLink provides comprehensive observability features for monitoring AI operations in production:

- **Langfuse Integration**: LLM-specific observability with token tracking, cost analysis, and trace visualization
- **OpenTelemetry Support**: Standard distributed tracing compatible with Jaeger, Zipkin, and other backends
- **External Provider Mode**: Integrate with existing OpenTelemetry instrumentation without conflicts
- **Context Propagation**: Automatic context enrichment with user, session, and custom metadata

## Quick Start

### Basic Langfuse Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: "https://cloud.langfuse.com",
      environment: "production",
      release: "1.0.0",
    },
  },
});
```

### Environment Variables

```bash
# Langfuse credentials
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or self-hosted

# Optional defaults
LANGFUSE_ENVIRONMENT=production
LANGFUSE_RELEASE=1.0.0
```

## Context Management

### Setting Context

Use `setLangfuseContext` to attach metadata to all spans in an async context:

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

// With callback - context is scoped to callback execution
const result = await setLangfuseContext(
  {
    userId: "user-123",
    sessionId: "session-456",
    conversationId: "conv-789",
    requestId: "req-abc",
    traceName: "customer-support-chat",
    metadata: {
      feature: "support",
      tier: "premium",
      region: "us-east-1",
    },
  },
  async () => {
    return await neurolink.generate("Hello");
  },
);

// Without callback - context applies to current execution
await setLangfuseContext({
  userId: "user-123",
  sessionId: "session-456",
});
```

### Context Fields

| Field            | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `userId`         | Identify the user for per-user analytics   |
| `sessionId`      | Group traces within a user session         |
| `conversationId` | Group traces in a conversation thread      |
| `requestId`      | Correlate with application logs            |
| `traceName`      | Custom name in Langfuse UI                 |
| `metadata`       | Key-value pairs for filtering and analysis |

### Reading Context

```typescript
import { getLangfuseContext } from "@juspay/neurolink";

const context = getLangfuseContext();
if (context) {
  console.log(
    `User: ${context.userId}, Conversation: ${context.conversationId}`,
  );
}
```

## Operation Name Support

NeuroLink automatically detects operation names from AI SDK spans and includes them in trace names for better observability. This provides immediate visibility into what type of AI operation is being performed.

### Operation Name Configuration

By default, NeuroLink automatically detects operation names from:

- **Vercel AI SDK spans**: Spans starting with `ai.` (e.g., `ai.streamText`, `ai.generateText`, `ai.embed`)
- **OpenTelemetry GenAI conventions**: Standard semantic convention operations (`chat`, `embeddings`, `text_completion`)

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      autoDetectOperationName: true, // Enabled by default
    },
  },
});
```

When auto-detection is enabled, traces automatically include the detected operation:

- A `generateText` call becomes: `user@email.com:ai.generateText`
- A `streamText` call becomes: `user@email.com:ai.streamText`
- An embedding call becomes: `user@email.com:embeddings`

### Trace Name Formats

Control how trace names are constructed using the `traceNameFormat` option:

| Format                   | Example Output                 | Description                 |
| ------------------------ | ------------------------------ | --------------------------- |
| `"userId:operationName"` | `user@email.com:ai.streamText` | Default format, user first  |
| `"operationName:userId"` | `ai.streamText:user@email.com` | Operation first             |
| `"operationName"`        | `ai.streamText`                | Operation only              |
| `"userId"`               | `user@email.com`               | User only (legacy behavior) |
| Custom function          | Custom output                  | Full control over format    |

```typescript
// Global configuration with format
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      autoDetectOperationName: true,
      traceNameFormat: "operationName:userId", // Operation first
    },
  },
});
```

### Custom Format Function

For full control over trace naming, provide a custom function:

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      autoDetectOperationName: true,
      traceNameFormat: (context) => {
        // Custom logic for trace name
        const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
        if (context.operationName && context.userId) {
          return `[${env}] ${context.operationName} - ${context.userId}`;
        }
        return context.operationName || context.userId || "unknown";
      },
    },
  },
});
// Output: "[prod] ai.streamText - user@email.com"
```

### Context-Level Configuration

Override operation name behavior at the context level:

```typescript
import { setLangfuseContext } from "@juspay/neurolink";

// Explicit operation name (overrides auto-detection)
await setLangfuseContext(
  {
    userId: "user-123",
    operationName: "custom-rag-pipeline",
  },
  async () => {
    return await neurolink.generate("Hello");
  },
);
// Trace name: "user-123:custom-rag-pipeline"

// Disable auto-detection for specific context
await setLangfuseContext(
  {
    userId: "user-123",
    autoDetectOperationName: false, // Override global setting
  },
  async () => {
    return await neurolink.generate("Hello");
  },
);
// Trace name: "user-123" (legacy behavior)

// Enable auto-detection when globally disabled
await setLangfuseContext(
  {
    userId: "user-123",
    autoDetectOperationName: true, // Enable for this context
  },
  async () => {
    return await neurolink.generate("Hello");
  },
);
// Trace name: "user-123:ai.generateText"
```

### Backward Compatibility

Operation name support is fully backward compatible:

1. **Explicit `traceName` takes priority**: If you set `traceName` in context, it always overrides auto-detected names:

   ```typescript
   await setLangfuseContext(
     {
       userId: "user-123",
       traceName: "my-custom-trace", // This takes priority
       operationName: "ignored-operation",
     },
     async () => {
       return await neurolink.generate("Hello");
     },
   );
   // Trace name: "my-custom-trace"
   ```

2. **Disable for legacy behavior**: Set `autoDetectOperationName: false` to restore previous behavior:

   ```typescript
   const neurolink = new NeuroLink({
     observability: {
       langfuse: {
         enabled: true,
         publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
         secretKey: process.env.LANGFUSE_SECRET_KEY!,
         autoDetectOperationName: false, // Legacy behavior
       },
     },
   });
   // Trace names will be userId only, as before
   ```

3. **Existing code works unchanged**: Code using `traceName` continues to work exactly as before:

   ```typescript
   // This still works exactly as before
   await setLangfuseContext(
     {
       userId: "user-123",
       sessionId: "session-456",
       traceName: "customer-support-chat",
     },
     async () => {
       return await neurolink.generate("Hello");
     },
   );
   // Trace name: "customer-support-chat"
   ```

### Priority Order

When determining the trace name, NeuroLink follows this priority order:

1. **Explicit `traceName`** in context (highest priority)
2. **Explicit `operationName`** in context + userId (formatted per `traceNameFormat`)
3. **Auto-detected operation name** from span + userId (if `autoDetectOperationName` is enabled)
4. **userId only** (fallback)

### Wrapper Span Support

When host applications create wrapper spans (trace-root spans) before AI operations, the standard auto-detection in `onStart()` fails because the AI SDK span does not exist yet at wrapper span creation time.

**The Problem:**

```typescript
// Host app creates wrapper span first
const span = tracer.startSpan("my-operation"); // onStart() runs here - no AI span yet
await neurolink.generate("Hello"); // AI SDK creates "ai.generateText" span later
span.end();
```

At the time the wrapper span starts, there is no AI SDK span to detect the operation from, so the trace name would only include the userId.

**The Solution:**

NeuroLink automatically handles this by detecting operations from child spans and updating the trace name when the wrapper span ends:

1. **Wrapper span starts** - `onStart()` sets traceName to just userId (e.g., `user-123`)
2. **AI SDK span starts** - `onStart()` detects `ai.streamText` and stores operation in a map keyed by traceId
3. **Wrapper span ends** - `onEnd()` looks up the stored operation and updates traceName to `user-123:ai.streamText`

This behavior is automatic and requires no code changes in host applications. The trace name in Langfuse will correctly include both the userId and the detected operation name.

## Custom Spans

Create custom spans for detailed tracing:

```typescript
import { getTracer, setLangfuseContext } from "@juspay/neurolink";

const tracer = getTracer("my-app", "1.0.0");

await setLangfuseContext({ userId: "user-123" }, async () => {
  const span = tracer.startSpan("process-request");
  try {
    // Add custom attributes
    span.setAttribute("request.type", "chat");
    span.setAttribute("model", "gpt-4");

    const result = await neurolink.generate("Hello");

    span.setAttribute("tokens.total", result.usage?.totalTokens ?? 0);
    return result;
  } catch (error) {
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
});
```

## External TracerProvider Mode

If your application already has OpenTelemetry instrumentation (e.g., for HTTP, database tracing), use external provider mode to avoid "duplicate registration" errors:

### Configuration

```typescript
import { NeuroLink, getSpanProcessors } from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// 1. Initialize NeuroLink with external provider mode
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      useExternalTracerProvider: true, // Don't create TracerProvider
    },
  },
});

// 2. Get NeuroLink's span processors
const neurolinkProcessors = getSpanProcessors();
// Returns: [ContextEnricher, LangfuseSpanProcessor]

// 3. Add to your existing OTEL setup
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

const jaegerExporter = new OTLPTraceExporter({
  url: "http://jaeger:4318/v1/traces",
});
const sdk = new NodeSDK({
  spanProcessors: [
    new BatchSpanProcessor(jaegerExporter),
    ...neurolinkProcessors,
  ],
});
sdk.start();
```

### Auto-Detection Mode

Alternatively, let NeuroLink auto-detect external providers:

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      autoDetectExternalProvider: true, // Auto-detect and skip if needed
    },
  },
});
```

### Available Exports

| Export                            | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `getSpanProcessors()`             | Returns `[ContextEnricher, LangfuseSpanProcessor]` |
| `createContextEnricher()`         | Factory for creating ContextEnricher instances     |
| `isUsingExternalTracerProvider()` | Check if in external provider mode                 |
| `getLangfuseSpanProcessor()`      | Get the LangfuseSpanProcessor directly             |
| `getTracerProvider()`             | Get the TracerProvider (null in external mode)     |

## Vercel AI SDK Integration

NeuroLink automatically captures GenAI semantic convention attributes from Vercel AI SDK's `experimental_telemetry`:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { setLangfuseContext } from "@juspay/neurolink";

await setLangfuseContext(
  { userId: "user-123", conversationId: "conv-456" },
  async () => {
    const result = await generateText({
      model: openai("gpt-4"),
      prompt: "Explain quantum computing",
      experimental_telemetry: {
        isEnabled: true,
        functionId: "explain-topic",
      },
    });
    // Token usage, model info, and finish reason automatically captured
    return result;
  },
);
```

### Captured Attributes

The `ContextEnricher` automatically reads these GenAI attributes:

- `gen_ai.system` - AI provider (openai, anthropic, etc.)
- `gen_ai.request.model` - Model requested
- `gen_ai.usage.input_tokens` - Input tokens used
- `gen_ai.usage.output_tokens` - Output tokens used
- `ai.finishReason` - Why generation finished

## Health Monitoring

Check Langfuse health status:

```typescript
import { getLangfuseHealthStatus } from "@juspay/neurolink";

const status = getLangfuseHealthStatus();
console.log({
  isHealthy: status.isHealthy,
  initialized: status.initialized,
  credentialsValid: status.credentialsValid,
  enabled: status.enabled,
  hasProcessor: status.hasProcessor,
  usingExternalProvider: status.usingExternalProvider,
  config: status.config,
});
```

## Flushing and Shutdown

Ensure all spans are sent before process exit:

```typescript
import { flushOpenTelemetry, shutdownOpenTelemetry } from "@juspay/neurolink";

// Flush pending spans
await flushOpenTelemetry();

// Graceful shutdown (flushes and cleans up)
await shutdownOpenTelemetry();
```

### Graceful Shutdown Example

```typescript
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await flushOpenTelemetry();
  await shutdownOpenTelemetry();
  process.exit(0);
});
```

## Best Practices

### 1. Always Set Context at Request Boundaries

```typescript
app.use(async (req, res, next) => {
  await setLangfuseContext({
    userId: req.user?.id,
    sessionId: req.session?.id,
    requestId: req.headers["x-request-id"],
  });
  next();
});
```

### 2. Use Metadata for Filtering

```typescript
await setLangfuseContext({
  metadata: {
    feature: "chat",
    experiment: "gpt4-vs-claude",
    abTestGroup: "B",
  },
});
```

### 3. Create Spans for Business Logic

```typescript
const tracer = getTracer("my-app");
const span = tracer.startSpan("retrieve-context");
try {
  const docs = await vectorStore.search(query);
  span.setAttribute("docs.count", docs.length);
} finally {
  span.end();
}
```

### 4. Handle Errors Properly

```typescript
const span = tracer.startSpan("ai-generation");
try {
  return await neurolink.generate({ input: { text: prompt } });
} catch (error) {
  span.recordException(error as Error);
  span.setStatus({ code: 2, message: (error as Error).message });
  throw error;
} finally {
  span.end();
}
```

## Troubleshooting

### Empty span processors from getSpanProcessors()

**Problem**: `getSpanProcessors()` returns an empty array.

**Solution**: Ensure NeuroLink is initialized before calling `getSpanProcessors()`:

```typescript
// Wrong - calling before initialization
const processors = getSpanProcessors(); // Returns []

// Correct - call after initialization
const neurolink = new NeuroLink({
  observability: { langfuse: { enabled: true, ... } }
});
const processors = getSpanProcessors(); // Returns [ContextEnricher, LangfuseSpanProcessor]
```

### Context not appearing in Langfuse traces

**Problem**: `userId`, `sessionId`, or other context fields don't appear in Langfuse.

**Solution**: Ensure `setLangfuseContext` is called in the same async context as your AI operations:

```typescript
// Wrong - context set outside the request handler
await setLangfuseContext({ userId: "user-123" });
// ... later in different async context
await neurolink.generate("Hello"); // Context lost!

// Correct - use callback to scope context
await setLangfuseContext({ userId: "user-123" }, async () => {
  await neurolink.generate("Hello"); // Context attached!
});
```

### Duplicate TracerProvider registration errors

**Problem**: Error like "TracerProvider already registered" or "duplicate registration".

**Solution**: Set `useExternalTracerProvider: true` in your config:

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      useExternalTracerProvider: true, // Add this!
    },
  },
});
```

### Spans not being sent to Langfuse

**Problem**: Traces don't appear in Langfuse dashboard.

**Solution**:

1. Verify credentials are correct
2. Check health status:

   ```typescript
   const status = getLangfuseHealthStatus();
   console.log(status); // Check isHealthy, credentialsValid
   ```

3. Ensure `flushOpenTelemetry()` is called before process exit
4. Check network connectivity to Langfuse endpoint

## API Reference

The following functions and types are exported from `@juspay/neurolink`:

**Functions:**

- `setLangfuseContext` - Set context for Langfuse traces
- `getLangfuseContext` - Get current Langfuse context
- `getTracer` - Get OpenTelemetry tracer instance
- `getSpanProcessors` - Get span processors for external TracerProvider integration

**Types:**

- `LangfuseConfig` - Configuration options for Langfuse integration
- `LangfuseSpanAttributes` - GenAI semantic convention attributes

## See Also

- [Telemetry Guide](../telemetry-guide.md) - OpenTelemetry setup with Jaeger
- [Enterprise Monitoring](../guides/enterprise/monitoring.md) - Prometheus and Grafana setup
- [Analytics Reference](../reference/analytics.md) - Token and cost tracking
