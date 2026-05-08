[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Sampler

# Type Alias: Sampler

> **Sampler** = `object`

Defined in: [types/observability.ts:220](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L220)

Sampler type for controlling which spans are exported.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/observability.ts:222](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L222)

Sampler name for identification

## Methods

### shouldSample()

> **shouldSample**(`span`): `boolean`

Defined in: [types/observability.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L225)

Determine if a span should be sampled

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

`boolean`

---

### getDescription()

> **getDescription**(): `string`

Defined in: [types/observability.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L228)

Get sampling decision description

#### Returns

`string`
