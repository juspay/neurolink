[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseHealthStatus

# Function: getLangfuseHealthStatus()

> **getLangfuseHealthStatus**(): `object`

Defined in: [services/server/ai/observability/instrumentation.ts:1310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1310)

Get health status for Langfuse observability

## Returns

`object`

Health status object with initialization and configuration details

### isHealthy

> **isHealthy**: `boolean`

### initialized

> **initialized**: `boolean`

### credentialsValid

> **credentialsValid**: `boolean`

### enabled

> **enabled**: `boolean`

### hasProcessor

> **hasProcessor**: `boolean`

### usingExternalProvider

> **usingExternalProvider**: `boolean`

### config?

> `optional` **config?**: `object`

#### config.baseUrl

> **baseUrl**: `string`

#### config.environment

> **environment**: `string`

#### config.release

> **release**: `string`
