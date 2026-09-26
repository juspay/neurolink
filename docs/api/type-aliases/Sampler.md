[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Sampler

# Type Alias: Sampler

> **Sampler** = `object`

Sampler type for controlling which spans are exported.

## Properties

### name

> `readonly` **name**: `string`

Sampler name for identification

## Methods

### shouldSample()

> **shouldSample**(`span`): `boolean`

Determine if a span should be sampled

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

`boolean`

---

### getDescription()

> **getDescription**(): `string`

Get sampling decision description

#### Returns

`string`
