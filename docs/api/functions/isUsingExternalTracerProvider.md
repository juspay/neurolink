[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isUsingExternalTracerProvider

# Function: isUsingExternalTracerProvider()

> **isUsingExternalTracerProvider**(): `boolean`

Defined in: [services/server/ai/observability/instrumentation.ts:584](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L584)

Check if using external TracerProvider mode

Returns true if NeuroLink is operating in external TracerProvider mode,
meaning it did not create or register its own TracerProvider. In this mode,
you must add NeuroLink's span processors to your own TracerProvider.

## Returns

`boolean`

`true` if operating in external TracerProvider mode, `false` otherwise

## When This Returns True

- `useExternalTracerProvider: true` was set in LangfuseConfig
- `autoDetectExternalProvider: true` was set and detected external provider
- TracerProvider registration failed due to duplicate registration

## Example

```typescript
import {
  isUsingExternalTracerProvider,
  getSpanProcessors,
} from "@juspay/neurolink";

// Check mode after initialization
if (isUsingExternalTracerProvider()) {
  console.log(
    "External provider mode - add processors to your TracerProvider:",
  );
  const processors = getSpanProcessors();
  // Add processors to your existing OTEL setup
  myTracerProvider.addSpanProcessor(processors[0]); // ContextEnricher
  myTracerProvider.addSpanProcessor(processors[1]); // LangfuseSpanProcessor
} else {
  console.log("Standalone mode - NeuroLink managing its own TracerProvider");
}
```

## Conditional Setup

```typescript
import {
  NeuroLink,
  isUsingExternalTracerProvider,
  getSpanProcessors,
} from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      autoDetectExternalProvider: true, // Auto-detect mode
    },
  },
});

// Only set up OTEL SDK if NeuroLink isn't managing it
if (isUsingExternalTracerProvider()) {
  const sdk = new NodeSDK({
    spanProcessors: [...getSpanProcessors()],
  });
  sdk.start();
}
```

## See Also

- [getSpanProcessors](./getSpanProcessors.md) - Get processors for external mode
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
- [Observability Guide](../../features/observability.md) - Full setup guide
