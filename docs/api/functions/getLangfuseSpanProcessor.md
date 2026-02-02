[**NeuroLink API Reference v8.42.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseSpanProcessor

# Function: getLangfuseSpanProcessor()

> **getLangfuseSpanProcessor**(): `LangfuseSpanProcessor | null`

Defined in: [services/server/ai/observability/instrumentation.ts:457](https://github.com/juspay/neurolink/blob/main/src/lib/services/server/ai/observability/instrumentation.ts#L457)

Get the LangfuseSpanProcessor instance

Returns the LangfuseSpanProcessor that sends spans to the Langfuse platform.
This processor is created during initialization and is available in both
standalone and external provider modes.

## Returns

`LangfuseSpanProcessor | null`

The LangfuseSpanProcessor instance, or `null` if:

- Langfuse is not enabled
- Credentials are missing or invalid
- Initialization has not occurred

## Example

```typescript
import { getLangfuseSpanProcessor } from "@juspay/neurolink";

const processor = getLangfuseSpanProcessor();
if (processor) {
  // Manually flush pending spans to Langfuse
  await processor.forceFlush();

  // Shutdown the processor
  await processor.shutdown();
}
```

## External Provider Mode Usage

```typescript
import {
  createContextEnricher,
  getLangfuseSpanProcessor,
} from "@juspay/neurolink";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

// Create your own TracerProvider
const provider = new NodeTracerProvider();

// Add NeuroLink's processors
provider.addSpanProcessor(createContextEnricher());

const langfuseProcessor = getLangfuseSpanProcessor();
if (langfuseProcessor) {
  provider.addSpanProcessor(langfuseProcessor);
}

provider.register();
```

## Processor Behavior

The LangfuseSpanProcessor:

1. **Collects spans** from OpenTelemetry instrumentation
2. **Transforms spans** to Langfuse trace format
3. **Batches spans** for efficient network usage
4. **Sends to Langfuse** via the configured `baseUrl`

## Notes

- The processor is reused across calls (singleton)
- Available in both standalone and external provider modes
- Requires valid Langfuse credentials (`publicKey`, `secretKey`)
- Use `getSpanProcessors()` to get both ContextEnricher and LangfuseSpanProcessor together

## See Also

- [getSpanProcessors](./getSpanProcessors.md) - Get both processors together
- [createContextEnricher](./createContextEnricher.md) - Create ContextEnricher for context propagation
- [flushOpenTelemetry](./flushOpenTelemetry.md) - Convenience method to flush all spans
- [LangfuseConfig](../type-aliases/LangfuseConfig.md) - Configuration options
