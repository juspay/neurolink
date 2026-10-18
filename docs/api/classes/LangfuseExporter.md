[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseExporter

# Class: LangfuseExporter

## Description

Exporter that delivers observation spans to Langfuse's OTLP/HTTP JSON endpoint (`POST /api/public/otel/v1/traces`), which keeps native observation types and identity on every observation. Spans are queued without blocking and sent in batches, with at most `MAX_CONCURRENT_DELIVERIES` requests in flight; spans that end while every one is busy wait, at most `MAX_QUEUED_SPANS` of them, and the oldest beyond that are dropped, counted and warned about once a minute. Failed requests are retried with backoff when the failure is transient (429, 5xx, network), after the `Retry-After` of a 429 or 503 when it names one (at most `MAX_EXPORT_RETRY_AFTER_MS`). `flush()` and `shutdown()` wait at most `flushBudgetMs` and then drop what is still in flight, and a batch that could not be delivered is reported by `exportBatch`, logged at warn level and counted in the health check; when Langfuse took none of the latest batch (refused, failed or every span rejected), `getStatus()` and `healthCheck()` read unhealthy with the dropped count until a batch is accepted again. `exportSpan` reports only the buffer step, so a failed delivery never opens the registry's circuit breaker and spans that end after an outage are still buffered and sent.

## Extends

- `BaseExporter`

## Constructors

### Constructor

> **new LangfuseExporter**(`langfuse`): `LangfuseExporter`

#### Parameters

##### langfuse

[`LangfuseExporterConfig`](../type-aliases/LangfuseExporterConfig.md)

#### Returns

`LangfuseExporter`

#### Description

Creates an exporter for one Langfuse project.

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

> `protected` **withRetry**\<`T`\>(`operation`, `operationName`, `signal?`, `delayMs?`): `Promise`\<`T`\>

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

##### signal?

`AbortSignal`

Stops further attempts and cuts a backoff wait short when aborted

##### delayMs?

(`error`, `attempt`) => `number`

Milliseconds to wait before the next attempt, given why the attempt failed and its zero-based number; one second doubled per attempt by default

#### Returns

`Promise`\<`T`\>

The result of the operation

#### Throws

The last error if all retries fail, or the abort reason when the signal fires

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

> **exportSpan**(`span`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

Export a single span

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

The span data to export

#### Returns

`Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

#### Overrides

`BaseExporter.exportSpan`

---

### exportBatch()

> **exportBatch**(`spans`): `Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

Export multiple spans in batch

#### Parameters

##### spans

[`SpanData`](../type-aliases/SpanData.md)[]

Array of span data to export

#### Returns

`Promise`\<[`ExportResult`](../type-aliases/ExportResult.md)\>

#### Overrides

`BaseExporter.exportBatch`

---

### flush()

> **flush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

Resolves when delivery finished or the budget ran out.

#### Description

Sends everything buffered and waits for delivery, but no longer than the flush budget; spans still in flight when it runs out are dropped and counted, and spans still waiting for a delivery slot stay buffered.

#### Overrides

`BaseExporter.flush`

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

#### Overrides

`BaseExporter.bufferSpan`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

Resolves when the exporter has stopped.

#### Description

Delivers what is buffered, including spans that end while it drains, within the flush budget, then stops the exporter. Spans that could not be sent by then are dropped and counted, so none is left pending.

#### Overrides

`BaseExporter.shutdown`

---

### getStatus()

> **getStatus**(): [`ExporterStatus`](../type-aliases/ExporterStatus.md)

#### Returns

[`ExporterStatus`](../type-aliases/ExporterStatus.md)

The exporter's current state.

#### Description

Snapshot of this exporter for status reporting, without a network call: what is queued, what Langfuse accepted and what was dropped, and unhealthy while the latest delivery failed.

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

Check exporter health status
Implementations should make an actual API call to verify connectivity

#### Returns

`Promise`\<[`ExporterHealthStatus`](../type-aliases/ExporterHealthStatus.md)\>

#### Overrides

`BaseExporter.healthCheck`

---

### ping()

> `protected` **ping**(): `Promise`\<`void`\>

Ping the exporter's backend to verify connectivity
Override this in subclasses to provide backend-specific health check

#### Returns

`Promise`\<`void`\>

#### Overrides

`BaseExporter.ping`
