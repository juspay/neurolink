[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NoOpExporter

# Class: NoOpExporter

No-op exporter for when observability is disabled
Provides zero-overhead behavior

## Extends

- `BaseExporter`

## Constructors

### Constructor

> **new NoOpExporter**(): `NoOpExporter`

#### Returns

`NoOpExporter`

#### Overrides

`BaseExporter.constructor`

## Properties

### name

> `protected` `readonly` **name**: `string`

#### Inherited from

`BaseExporter.name`

---

### config

> `protected` `readonly` **config**: [`ExporterConfig`](../type-aliases/ExporterConfig.md)

#### Inherited from

`BaseExporter.config`

---

### initialized

> `protected` **initialized**: `boolean` = `false`

#### Inherited from

`BaseExporter.initialized`

---

### buffer

> `protected` **buffer**: [`SpanData`](../type-aliases/SpanData.md)[] = `[]`

#### Inherited from

`BaseExporter.buffer`

---

### maxBufferSize

> `protected` `readonly` **maxBufferSize**: `number`

#### Inherited from

`BaseExporter.maxBufferSize`

---

### retries

> `protected` `readonly` **retries**: `number`

#### Inherited from

`BaseExporter.retries`

---

### flushInterval

> `protected` **flushInterval**: `Timeout` \| `null` = `null`

#### Inherited from

`BaseExporter.flushInterval`

---

### lastExportTime

> `protected` **lastExportTime**: `number` = `0`

#### Inherited from

`BaseExporter.lastExportTime`

## Methods

### ping()

> `protected` **ping**(): `Promise`\<`void`\>

Ping the exporter's backend to verify connectivity
Override this in subclasses to provide backend-specific health check

#### Returns

`Promise`\<`void`\>

#### Inherited from

`BaseExporter.ping`

---

### bufferSpan()

> `protected` **bufferSpan**(`span`): `void`

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

Stop the automatic flush interval

#### Returns

`void`

#### Inherited from

`BaseExporter.stopFlushInterval`

---

### getName()

> **getName**(): `string`

Get exporter name

#### Returns

`string`

#### Inherited from

`BaseExporter.getName`

---

### isInitialized()

> **isInitialized**(): `boolean`

Check if exporter is initialized

#### Returns

`boolean`

#### Inherited from

`BaseExporter.isInitialized`

---

### getPendingCount()

> **getPendingCount**(): `number`

Get number of pending spans in buffer

#### Returns

`number`

#### Inherited from

`BaseExporter.getPendingCount`

---

### getLastExportTime()

> **getLastExportTime**(): `number`

Get last export timestamp

#### Returns

`number`

#### Inherited from

`BaseExporter.getLastExportTime`

---

### createSuccessResult()

> `protected` **createSuccessResult**(`exportedCount`, `durationMs`): [`ExportResult`](../type-aliases/ExportResult.md)

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

Initialize the exporter connection
Must be called before exporting spans

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.initialize`

---

### exportSpan()

> **exportSpan**(`_span`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

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

Flush all buffered spans

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.flush`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Shutdown the exporter gracefully
Should flush remaining spans before closing

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.shutdown`

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

Check exporter health status
Implementations should make an actual API call to verify connectivity

#### Returns

`Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

#### Overrides

`BaseExporter.healthCheck`
