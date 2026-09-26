[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanProcessor

# Type Alias: SpanProcessor

> **SpanProcessor** = `object`

Span processor type for composable span processing pipelines.

## Properties

### name

> `readonly` **name**: `string`

Processor name for identification

## Methods

### process()

> **process**(`span`): [`SpanData`](SpanData.md) \| `null`

Process a span before export, returns null to drop the span

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

[`SpanData`](SpanData.md) \| `null`

---

### processAsync()?

> `optional` **processAsync**(`span`): `Promise`\<[`SpanData`](SpanData.md) \| `null`\>

Optional async processing (for external lookups, etc.)

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

`Promise`\<[`SpanData`](SpanData.md) \| `null`\>

---

### shutdown()?

> `optional` **shutdown**(): `Promise`\<`void`\>

Shutdown the processor (cleanup resources)

#### Returns

`Promise`\<`void`\>
