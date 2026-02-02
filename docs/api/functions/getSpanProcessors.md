[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getSpanProcessors

# Function: getSpanProcessors()

> **getSpanProcessors**(): `SpanProcessor[]`

Defined in: [services/server/ai/observability/instrumentation.ts:568](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L568)

Get all span processors that NeuroLink would use

Convenience function that returns `[ContextEnricher, LangfuseSpanProcessor]`.
Use this when integrating with an external TracerProvider to add NeuroLink's
observability capabilities to your existing OpenTelemetry setup.

## Returns

`SpanProcessor[]`

Array of span processors, or empty array if not initialized

The returned array contains:

1. **ContextEnricher** - Enriches spans with Langfuse context (userId, sessionId, etc.)
2. **LangfuseSpanProcessor** - Sends spans to Langfuse platform

## Example

```typescript
import { NeuroLink, getSpanProcessors } from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

// 1. Initialize NeuroLink with external provider mode
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      useExternalTracerProvider: true,
    },
  },
});

// 2. Get NeuroLink's span processors
const neurolinkProcessors = getSpanProcessors();

// 3. Add to your existing OTEL setup
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

## Notes

- Must be called after `initializeOpenTelemetry()` or NeuroLink initialization
- Returns empty array if observability is not initialized or disabled
- Each call to `getSpanProcessors()` creates a new ContextEnricher instance
- The LangfuseSpanProcessor is reused across calls

## See Also

- [createContextEnricher](./createContextEnricher.md) - Create ContextEnricher separately
- [isUsingExternalTracerProvider](./isUsingExternalTracerProvider.md) - Check provider mode
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
