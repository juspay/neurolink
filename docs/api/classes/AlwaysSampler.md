[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AlwaysSampler

# Class: AlwaysSampler

Defined in: [observability/sampling/samplers.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/observability/sampling/samplers.ts#L18)

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

Defined in: [observability/sampling/samplers.ts:19](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/observability/sampling/samplers.ts#L19)

Sampler name for identification

#### Implementation of

`Sampler.name`

## Methods

### shouldSample()

> **shouldSample**(`_span`): `boolean`

Defined in: [observability/sampling/samplers.ts:21](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/observability/sampling/samplers.ts#L21)

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

Defined in: [observability/sampling/samplers.ts:25](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/observability/sampling/samplers.ts#L25)

Get sampling decision description

#### Returns

`string`

#### Implementation of

`Sampler.getDescription`
