[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / getLangfuseHealthStatus

# Function: getLangfuseHealthStatus()

> **getLangfuseHealthStatus**(): `object`

Defined in: [services/server/ai/observability/instrumentation.ts:208](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/services/server/ai/observability/instrumentation.ts#L208)

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
