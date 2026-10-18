[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExporterSpanProcessor

# Class: ExporterSpanProcessor

## Description

OpenTelemetry span processor that turns every observation span into `SpanData` and hands it to an `ExporterRegistry`, so one instrumentation feeds Langfuse, Datadog, Sentry and every other registered exporter. Spans that are not observations (health checks, auth, middleware, NeuroLink's helper spans), wrapper spans marked `langfuse.internal` and spans from other libraries are skipped and their children are re-parented onto the nearest exported ancestor. `shutdown()` shuts the registry's exporters down, as it always did, unless the processor was created to leave them running. Parent ids are read from OpenTelemetry SDK 2.x (`parentSpanContext`) and 1.x (`parentSpanId`) spans alike. At most `MAX_REMEMBERED_SPANS` open and ended spans are remembered for re-parenting; an ancestor of a span that is still open is kept past that limit. Delivery never blocks the span's thread, and a span that cannot be converted is skipped without throwing into the code that ended it.

## Implements

- `SpanProcessor`

## Constructors

### Constructor

> **new ExporterSpanProcessor**(`registry`, `shutsDownExporters?`): `ExporterSpanProcessor`

#### Parameters

##### registry

[`ExporterRegistry`](ExporterRegistry.md)

{ExporterRegistry} - Registry that receives every exported span.

##### shutsDownExporters?

`boolean` = `true`

{boolean} - Whether `shutdown()` also shuts down the registry's exporters; defaults to `true`. Pass `false` for a host provider that is shut down and rebuilt while the exporters stay shared.

#### Returns

`ExporterSpanProcessor`

#### Description

Creates a processor bound to a registry.

## Methods

### onStart()

> **onStart**(`span`, `parentContext`): `void`

#### Parameters

##### span

`Span`

{Span} - Span that just started.

##### parentContext

`Context`

{Context} - Context the span was started in.

#### Returns

`void`

Nothing.

#### Description

Copies the propagated Langfuse trace attributes (user, session, trace name, tags, metadata) from the parent context onto the new span and remembers it until it ends.

#### Implementation of

`OtelSpanProcessor.onStart`

---

### onEnd()

> **onEnd**(`span`): `void`

#### Parameters

##### span

`ReadableSpan`

{ReadableSpan} - Span that just ended.

#### Returns

`void`

Nothing.

#### Description

Exports an ended observation span without waiting for the exporters.

#### Implementation of

`OtelSpanProcessor.onEnd`

---

### forceFlush()

> **forceFlush**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

Resolves when all exporters have flushed.

#### Description

Flushes every exporter in the registry.

#### Implementation of

`OtelSpanProcessor.forceFlush`

---

### shutdown()

> **shutdown**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

Resolves when the exporters have shut down or flushed.

#### Description

Shuts down every exporter in the registry, or only flushes them when the processor was created to leave them running.

#### Implementation of

`OtelSpanProcessor.shutdown`
