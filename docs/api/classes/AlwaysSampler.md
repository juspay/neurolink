[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AlwaysSampler

# Class: AlwaysSampler

Defined in: [observability/sampling/samplers.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/sampling/samplers.ts#L18)

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

Defined in: [observability/sampling/samplers.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/sampling/samplers.ts#L19)

Sampler name for identification

#### Implementation of

`Sampler.name`

## Methods

### shouldSample()

> **shouldSample**(`_span`): `boolean`

Defined in: [observability/sampling/samplers.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/sampling/samplers.ts#L21)

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

Defined in: [observability/sampling/samplers.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/sampling/samplers.ts#L25)

Get sampling decision description

#### Returns

`string`

#### Implementation of

`Sampler.getDescription`
