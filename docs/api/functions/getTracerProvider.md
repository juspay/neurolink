[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getTracerProvider

# Function: getTracerProvider()

> **getTracerProvider**(): `NodeTracerProvider | null`

Defined in: [services/server/ai/observability/instrumentation.ts:464](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L464)

Get the NodeTracerProvider instance managed by NeuroLink

Returns the TracerProvider that NeuroLink created and registered, or `null`
if NeuroLink is operating in external provider mode or if not initialized.

## Returns

`NodeTracerProvider | null`

The NodeTracerProvider instance, or `null` if:

- NeuroLink is in external provider mode (`useExternalTracerProvider: true`)
- OpenTelemetry is not initialized
- Langfuse is disabled

## When This Returns Null

- `useExternalTracerProvider: true` was set in LangfuseConfig
- `autoDetectExternalProvider: true` detected an external provider
- TracerProvider registration failed (switched to external mode)
- `initializeOpenTelemetry()` was not called or failed

## Example

```typescript
import {
  getTracerProvider,
  isUsingExternalTracerProvider,
} from "@juspay/neurolink";

// Check the mode first
if (isUsingExternalTracerProvider()) {
  console.log("External mode - no TracerProvider from NeuroLink");
} else {
  const provider = getTracerProvider();
  if (provider) {
    console.log("Standalone mode - NeuroLink managing TracerProvider");
    // Access provider methods if needed
    await provider.forceFlush();
  }
}
```

## Advanced Usage

```typescript
import { getTracerProvider } from "@juspay/neurolink";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// Add additional exporters to NeuroLink's provider
const provider = getTracerProvider();
if (provider) {
  // Add Jaeger exporter alongside Langfuse
  const jaegerExporter = new OTLPTraceExporter({
    url: "http://jaeger:4318/v1/traces",
  });
  provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
}
```

## Notes

- In standalone mode, NeuroLink creates and registers its own TracerProvider
- In external provider mode, this always returns `null`
- Use `isUsingExternalTracerProvider()` to check the current mode
- The provider includes ContextEnricher and LangfuseSpanProcessor

## See Also

- [isUsingExternalTracerProvider](./isUsingExternalTracerProvider.md) - Check provider mode
- [getSpanProcessors](./getSpanProcessors.md) - Get processors for external mode
- [getLangfuseSpanProcessor](./getLangfuseSpanProcessor.md) - Get Langfuse processor directly
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
