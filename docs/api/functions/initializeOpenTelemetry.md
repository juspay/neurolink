[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / initializeOpenTelemetry

# Function: initializeOpenTelemetry()

> **initializeOpenTelemetry**(`config`): `Promise`\<`void`\>

Defined in: [services/server/ai/observability/instrumentation.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/services/server/ai/observability/instrumentation.ts#L1080)

Initialize OpenTelemetry with Langfuse span processor

This connects Vercel AI SDK's experimental_telemetry to Langfuse by:

1. Creating LangfuseSpanProcessor with Langfuse credentials
2. Creating a NodeTracerProvider with service metadata and span processor
3. Registering the provider globally for AI SDK to use

NEW: If useExternalTracerProvider is true or autoDetectExternalProvider detects
an existing provider, steps 2 and 3 are skipped. The span processors are still
created and can be retrieved via getSpanProcessors().

## Parameters

### config

[`LangfuseConfig`](../type-aliases/LangfuseConfig.md)

Langfuse configuration passed from parent application

## Returns

`Promise`\<`void`\>
