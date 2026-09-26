[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterRegistry

# Class: ExporterRegistry

Registry for managing multiple observability exporters
Includes circuit breaker protection to prevent cascading failures

## Constructors

### Constructor

> **new ExporterRegistry**(): `ExporterRegistry`

#### Returns

`ExporterRegistry`

## Methods

### register()

> **register**(`exporter`): `void`

Register an exporter

#### Parameters

##### exporter

`BaseExporter`

#### Returns

`void`

---

### unregister()

> **unregister**(`name`): `boolean`

Unregister an exporter

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### get()

> **get**(`name`): `BaseExporter` \| `undefined`

Get an exporter by name

#### Parameters

##### name

`string`

#### Returns

`BaseExporter` \| `undefined`

---

### getNames()

> **getNames**(): `string`[]

Get all registered exporter names

#### Returns

`string`[]

---

### getCount()

> **getCount**(): `number`

Get total exporter count

#### Returns

`number`

---

### setDefault()

> **setDefault**(`name`): `void`

Set the default exporter

#### Parameters

##### name

`string`

#### Returns

`void`

---

### getDefault()

> **getDefault**(): `BaseExporter` \| `undefined`

Get the default exporter

#### Returns

`BaseExporter` \| `undefined`

---

### setSampler()

> **setSampler**(`sampler`): `void`

Set the sampler for the registry

#### Parameters

##### sampler

[`Sampler`](../type-aliases/Sampler.md)

#### Returns

`void`

---

### getSampler()

> **getSampler**(): [`Sampler`](../type-aliases/Sampler.md)

Get the current sampler

#### Returns

[`Sampler`](../type-aliases/Sampler.md)

---

### configureCircuitBreaker()

> **configureCircuitBreaker**(`config`): `void`

Configure the circuit breaker settings

#### Parameters

##### config

`Partial`\<[`ObservabilityCircuitBreakerConfig`](../type-aliases/ObservabilityCircuitBreakerConfig.md)\>

Partial circuit breaker configuration

#### Returns

`void`

---

### getCircuitBreakerStatus()

> **getCircuitBreakerStatus**(`exporterName`): [`ObservabilityCircuitBreakerState`](../type-aliases/ObservabilityCircuitBreakerState.md) \| `undefined`

Get circuit breaker status for an exporter

#### Parameters

##### exporterName

`string`

Name of the exporter

#### Returns

[`ObservabilityCircuitBreakerState`](../type-aliases/ObservabilityCircuitBreakerState.md) \| `undefined`

Circuit breaker state or undefined if not tracked

---

### resetCircuitBreaker()

> **resetCircuitBreaker**(`exporterName`): `void`

Reset circuit breaker for an exporter

#### Parameters

##### exporterName

`string`

Name of the exporter

#### Returns

`void`

---

### exportToAll()

> **exportToAll**(`span`): `Promise`\<`Map`\<`string`, [`ExportResult`](../type-aliases/ExportResult.md)\>\>

Export span to all registered exporters
Applies sampling and circuit breaker protection before export

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`Promise`\<`Map`\<`string`, [`ExportResult`](../type-aliases/ExportResult.md)\>\>

---

### exportTo()

> **exportTo**(`name`, `span`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md) \| `null`\>

Export span to a specific exporter
Applies sampling and circuit breaker protection

#### Parameters

##### name

`string`

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`Promise`\<[`ExportResult`](../type-aliases/ExportResult.md) \| `null`\>

---

### initializeAll()

> **initializeAll**(): `Promise`\<`void`\>

Initialize all exporters

#### Returns

`Promise`\<`void`\>

---

### shutdownAll()

> **shutdownAll**(): `Promise`\<`void`\>

Shutdown all exporters

#### Returns

`Promise`\<`void`\>

---

### flushAll()

> **flushAll**(): `Promise`\<`void`\>

Flush all exporters

#### Returns

`Promise`\<`void`\>

---

### healthCheckAll()

> **healthCheckAll**(): `Promise`\<`Map`\<`string`, [`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>\>

Get health status of all exporters

#### Returns

`Promise`\<`Map`\<`string`, [`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Check if all exporters are healthy

#### Returns

`Promise`\<`boolean`\>

---

### getTotalPendingSpans()

> **getTotalPendingSpans**(): `number`

Get total pending spans across all exporters

#### Returns

`number`

---

### clear()

> **clear**(): `void`

Clear all registered exporters and reset state
(For testing and cleanup)

#### Returns

`void`
