[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanProcessor

# Type Alias: SpanProcessor

> **SpanProcessor** = `object`

Defined in: [types/observability.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L234)

Span processor type for composable span processing pipelines.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/observability.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L236)

Processor name for identification

## Methods

### process()

> **process**(`span`): [`SpanData`](SpanData.md) \| `null`

Defined in: [types/observability.ts:239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L239)

Process a span before export, returns null to drop the span

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

[`SpanData`](SpanData.md) \| `null`

---

### processAsync()?

> `optional` **processAsync**(`span`): `Promise`\<[`SpanData`](SpanData.md) \| `null`\>

Defined in: [types/observability.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L242)

Optional async processing (for external lookups, etc.)

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

`Promise`\<[`SpanData`](SpanData.md) \| `null`\>

---

### shutdown()?

> `optional` **shutdown**(): `Promise`\<`void`\>

Defined in: [types/observability.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L245)

Shutdown the processor (cleanup resources)

#### Returns

`Promise`\<`void`\>
