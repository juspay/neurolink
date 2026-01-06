[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / initializeOpenTelemetry

# Function: initializeOpenTelemetry()

> **initializeOpenTelemetry**(`config`): `void`

Defined in: [services/server/ai/observability/instrumentation.ts:73](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/services/server/ai/observability/instrumentation.ts#L73)

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
