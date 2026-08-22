[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeverSampler

# Class: NeverSampler

Defined in: [observability/sampling/samplers.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/observability/sampling/samplers.ts#L33)

Never sample any spans

## Implements

- [`Sampler`](../type-aliases/Sampler.md)

## Constructors

### Constructor

> **new NeverSampler**(): `NeverSampler`

#### Returns

`NeverSampler`

## Properties

### name

> `readonly` **name**: `"never"` = `"never"`

Defined in: [observability/sampling/samplers.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/observability/sampling/samplers.ts#L34)

Sampler name for identification

#### Implementation of

`Sampler.name`

## Methods

### shouldSample()

> **shouldSample**(`_span`): `boolean`

Defined in: [observability/sampling/samplers.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/observability/sampling/samplers.ts#L36)

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

Defined in: [observability/sampling/samplers.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/observability/sampling/samplers.ts#L40)

Get sampling decision description

#### Returns

`string`

#### Implementation of

`Sampler.getDescription`
