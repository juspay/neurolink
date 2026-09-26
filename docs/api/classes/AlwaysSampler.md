[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AlwaysSampler

# Class: AlwaysSampler

Always sample all spans

## Implements

- [`Sampler`](../type-aliases/Sampler.md)

## Constructors

### Constructor

> **new AlwaysSampler**(): `AlwaysSampler`

#### Returns

`AlwaysSampler`

## Properties

### name

> `readonly` **name**: `"always"` = `"always"`

Sampler name for identification

#### Implementation of

`Sampler.name`

## Methods

### shouldSample()

> **shouldSample**(`_span`): `boolean`

Determine if a span should be sampled

#### Parameters

##### \_span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`boolean`

#### Implementation of

`Sampler.shouldSample`

---

### getDescription()

> **getDescription**(): `string`

Get sampling decision description

#### Returns

`string`

#### Implementation of

`Sampler.getDescription`
