[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NoOpExporter

# Class: NoOpExporter

Defined in: [observability/exporters/baseExporter.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L243)

No-op exporter for when observability is disabled
Provides zero-overhead behavior

## Extends

- `BaseExporter`

## Constructors

### Constructor

> **new NoOpExporter**(): `NoOpExporter`

Defined in: [observability/exporters/baseExporter.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L244)

#### Returns

`NoOpExporter`

#### Overrides

`BaseExporter.constructor`

## Properties

### name

> `protected` `readonly` **name**: `string`

Defined in: [observability/exporters/baseExporter.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L19)

#### Inherited from

`BaseExporter.name`

---

### config

> `protected` `readonly` **config**: [`ExporterConfig`](../type-aliases/ExporterConfig.md)

Defined in: [observability/exporters/baseExporter.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L20)

#### Inherited from

`BaseExporter.config`

---

### initialized

> `protected` **initialized**: `boolean` = `false`

Defined in: [observability/exporters/baseExporter.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L21)

#### Inherited from

`BaseExporter.initialized`

---

### buffer

> `protected` **buffer**: [`SpanData`](../type-aliases/SpanData.md)[] = `[]`

Defined in: [observability/exporters/baseExporter.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L22)

#### Inherited from

`BaseExporter.buffer`

---

### maxBufferSize

> `protected` `readonly` **maxBufferSize**: `number`

Defined in: [observability/exporters/baseExporter.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L23)

#### Inherited from

`BaseExporter.maxBufferSize`

---

### retries

> `protected` `readonly` **retries**: `number`

Defined in: [observability/exporters/baseExporter.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L24)

#### Inherited from

`BaseExporter.retries`

---

### flushInterval

> `protected` **flushInterval**: `Timeout` \| `null` = `null`

Defined in: [observability/exporters/baseExporter.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L25)

#### Inherited from

`BaseExporter.flushInterval`

---

### lastExportTime

> `protected` **lastExportTime**: `number` = `0`

Defined in: [observability/exporters/baseExporter.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L26)

#### Inherited from

`BaseExporter.lastExportTime`

## Methods

### ping()

> `protected` **ping**(): `Promise`\<`void`\>

Defined in: [observability/exporters/baseExporter.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L74)

Ping the exporter's backend to verify connectivity
Override this in subclasses to provide backend-specific health check

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseExporter.ping`

---

### bufferSpan()

> `protected` **bufferSpan**(`span`): `void`

Defined in: [observability/exporters/baseExporter.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L83)

Buffer a span for batch export
Triggers flush if buffer is full

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`void`

#### Inherited from

`BaseExporter.bufferSpan`

---

### startFlushInterval()

> `protected` **startFlushInterval**(`intervalMs`): `void`

Defined in: [observability/exporters/baseExporter.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L95)

Start automatic flush interval

#### Parameters

##### intervalMs

`number`

Interval in milliseconds between flushes

#### Returns

`void`

#### Inherited from

`BaseExporter.startFlushInterval`

---

### stopFlushInterval()

> `protected` **stopFlushInterval**(): `void`

Defined in: [observability/exporters/baseExporter.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L111)

Stop the automatic flush interval

#### Returns

`void`

#### Inherited from

`BaseExporter.stopFlushInterval`

---

### getName()

> **getName**(): `string`

Defined in: [observability/exporters/baseExporter.ts:121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L121)

Get exporter name

#### Returns

`string`

#### Inherited from

`BaseExporter.getName`

---

### isInitialized()

> **isInitialized**(): `boolean`

Defined in: [observability/exporters/baseExporter.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L128)

Check if exporter is initialized

#### Returns

`boolean`

#### Inherited from

`BaseExporter.isInitialized`

---

### getPendingCount()

> **getPendingCount**(): `number`

Defined in: [observability/exporters/baseExporter.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L135)

Get number of pending spans in buffer

#### Returns

`number`

#### Inherited from

`BaseExporter.getPendingCount`

---

### getLastExportTime()

> **getLastExportTime**(): `number`

Defined in: [observability/exporters/baseExporter.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L142)

Get last export timestamp

#### Returns

`number`

#### Inherited from

`BaseExporter.getLastExportTime`

---

### createSuccessResult()

> `protected` **createSuccessResult**(`exportedCount`, `durationMs`): [`ExportResult`](../type-aliases/ExportResult.md)

Defined in: [observability/exporters/baseExporter.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L149)

Create a standard export result for success

#### Parameters

##### exportedCount

`number`

##### durationMs

`number`

#### Returns

[`ExportResult`](../type-aliases/ExportResult.md)

#### Inherited from

`BaseExporter.createSuccessResult`

---

### createFailureResult()

> `protected` **createFailureResult**(`spanIds`, `error`, `durationMs`, `retryable?`): [`ExportResult`](../type-aliases/ExportResult.md)

Defined in: [observability/exporters/baseExporter.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L165)

Create a standard export result for failure

#### Parameters

##### spanIds

`string`[]

##### error

`string`

##### durationMs

`number`

##### retryable?

`boolean` = `true`

#### Returns

[`ExportResult`](../type-aliases/ExportResult.md)

#### Inherited from

`BaseExporter.createFailureResult`

---

### createHealthStatus()

> `protected` **createHealthStatus**(`healthy`, `errors?`): [`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)

Defined in: [observability/exporters/baseExporter.ts:187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L187)

Create a standard health status

#### Parameters

##### healthy

`boolean`

##### errors?

`string`[]

#### Returns

[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)

#### Inherited from

`BaseExporter.createHealthStatus`

---

### withRetry()

> `protected` **withRetry**\<`T`\>(`operation`, `operationName`): `Promise`\<`T`\>

Defined in: [observability/exporters/baseExporter.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L207)

Execute an operation with exponential backoff retry

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

The async operation to execute

##### operationName

`string`

Name for logging purposes

#### Returns

`Promise`\<`T`\>

The result of the operation

#### Throws

The last error if all retries fail

#### Inherited from

`BaseExporter.withRetry`

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [observability/exporters/baseExporter.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L248)

Initialize the exporter connection
Must be called before exporting spans

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.initialize`

---

### exportSpan()

> **exportSpan**(`_span`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

Defined in: [observability/exporters/baseExporter.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L252)

Export a single span

#### Parameters

##### \_span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

#### Overrides

`BaseExporter.exportSpan`

---

### exportBatch()

> **exportBatch**(`_spans`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

Defined in: [observability/exporters/baseExporter.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L256)

Export multiple spans in batch

#### Parameters

##### \_spans

[`SpanData`](../type-aliases/SpanData.md)[]

#### Returns

`Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

#### Overrides

`BaseExporter.exportBatch`

---

### flush()

> **flush**(): `Promise`\<`void`\>

Defined in: [observability/exporters/baseExporter.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L260)

Flush all buffered spans

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.flush`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [observability/exporters/baseExporter.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L264)

Shutdown the exporter gracefully
Should flush remaining spans before closing

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.shutdown`

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

Defined in: [observability/exporters/baseExporter.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/exporters/baseExporter.ts#L268)

Check exporter health status
Implementations should make an actual API call to verify connectivity

#### Returns

`Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

#### Overrides

`BaseExporter.healthCheck`
