[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterRegistry

# Class: ExporterRegistry

Defined in: [observability/exporterRegistry.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L51)

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

Defined in: [observability/exporterRegistry.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L65)

Register an exporter

#### Parameters

##### exporter

`BaseExporter`

#### Returns

`void`

---

### unregister()

> **unregister**(`name`): `boolean`

Defined in: [observability/exporterRegistry.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L72)

Unregister an exporter

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### get()

> **get**(`name`): `BaseExporter` \| `undefined`

Defined in: [observability/exporterRegistry.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L79)

Get an exporter by name

#### Parameters

##### name

`string`

#### Returns

`BaseExporter` \| `undefined`

---

### getNames()

> **getNames**(): `string`[]

Defined in: [observability/exporterRegistry.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L86)

Get all registered exporter names

#### Returns

`string`[]

---

### getCount()

> **getCount**(): `number`

Defined in: [observability/exporterRegistry.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L93)

Get total exporter count

#### Returns

`number`

---

### setDefault()

> **setDefault**(`name`): `void`

Defined in: [observability/exporterRegistry.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L100)

Set the default exporter

#### Parameters

##### name

`string`

#### Returns

`void`

---

### getDefault()

> **getDefault**(): `BaseExporter` \| `undefined`

Defined in: [observability/exporterRegistry.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L110)

Get the default exporter

#### Returns

`BaseExporter` \| `undefined`

---

### setSampler()

> **setSampler**(`sampler`): `void`

Defined in: [observability/exporterRegistry.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L120)

Set the sampler for the registry

#### Parameters

##### sampler

[`Sampler`](../type-aliases/Sampler.md)

#### Returns

`void`

---

### getSampler()

> **getSampler**(): [`Sampler`](../type-aliases/Sampler.md)

Defined in: [observability/exporterRegistry.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L127)

Get the current sampler

#### Returns

[`Sampler`](../type-aliases/Sampler.md)

---

### configureCircuitBreaker()

> **configureCircuitBreaker**(`config`): `void`

Defined in: [observability/exporterRegistry.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L135)

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

Defined in: [observability/exporterRegistry.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L215)

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

Defined in: [observability/exporterRegistry.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L225)

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

Defined in: [observability/exporterRegistry.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L233)

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

Defined in: [observability/exporterRegistry.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L309)

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

Defined in: [observability/exporterRegistry.ts:381](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L381)

Initialize all exporters

#### Returns

`Promise`\<`void`\>

---

### shutdownAll()

> **shutdownAll**(): `Promise`\<`void`\>

Defined in: [observability/exporterRegistry.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L406)

Shutdown all exporters

#### Returns

`Promise`\<`void`\>

---

### flushAll()

> **flushAll**(): `Promise`\<`void`\>

Defined in: [observability/exporterRegistry.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L431)

Flush all exporters

#### Returns

`Promise`\<`void`\>

---

### healthCheckAll()

> **healthCheckAll**(): `Promise`\<`Map`\<`string`, [`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>\>

Defined in: [observability/exporterRegistry.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L454)

Get health status of all exporters

#### Returns

`Promise`\<`Map`\<`string`, [`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Defined in: [observability/exporterRegistry.ts:471](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L471)

Check if all exporters are healthy

#### Returns

`Promise`\<`boolean`\>

---

### getTotalPendingSpans()

> **getTotalPendingSpans**(): `number`

Defined in: [observability/exporterRegistry.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L479)

Get total pending spans across all exporters

#### Returns

`number`

---

### clear()

> **clear**(): `void`

Defined in: [observability/exporterRegistry.ts:492](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporterRegistry.ts#L492)

Clear all registered exporters and reset state
(For testing and cleanup)

#### Returns

`void`
