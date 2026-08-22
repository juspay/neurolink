[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getLangfuseHealthStatus

# Function: getLangfuseHealthStatus()

> **getLangfuseHealthStatus**(): `object`

Defined in: [services/server/ai/observability/instrumentation.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/services/server/ai/observability/instrumentation.ts#L1301)

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
