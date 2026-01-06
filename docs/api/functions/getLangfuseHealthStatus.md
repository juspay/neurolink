[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseHealthStatus

# Function: getLangfuseHealthStatus()

> **getLangfuseHealthStatus**(): `object`

Defined in: [services/server/ai/observability/instrumentation.ts:208](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/services/server/ai/observability/instrumentation.ts#L208)

Get health status for Langfuse observability

## Returns

`object`

### isHealthy

> **isHealthy**: `boolean` \| `undefined`

### initialized

> **initialized**: `boolean` = `isInitialized`

### credentialsValid

> **credentialsValid**: `boolean` = `isCredentialsValid`

### enabled

> **enabled**: `boolean`

### hasProcessor

> **hasProcessor**: `boolean`

### config

> **config**: \{ `baseUrl`: `string`; `environment`: `string`; `release`: `string`; \} \| `undefined`
