[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / initializeOpenTelemetry

# Function: initializeOpenTelemetry()

> **initializeOpenTelemetry**(`config`): `void`

Defined in: [services/server/ai/observability/instrumentation.ts:73](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/services/server/ai/observability/instrumentation.ts#L73)

Initialize OpenTelemetry with Langfuse span processor

This connects Vercel AI SDK's experimental_telemetry to Langfuse by:

1. Creating LangfuseSpanProcessor with Langfuse credentials
2. Creating a NodeTracerProvider with service metadata and span processor
3. Registering the provider globally for AI SDK to use

## Parameters

### config

[`LangfuseConfig`](../type-aliases/LangfuseConfig.md)

Langfuse configuration passed from parent application

## Returns

`void`
