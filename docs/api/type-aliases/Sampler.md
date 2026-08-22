[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Sampler

# Type Alias: Sampler

> **Sampler** = `object`

Defined in: [types/observability.ts:220](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L220)

Sampler type for controlling which spans are exported.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/observability.ts:222](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L222)

Sampler name for identification

## Methods

### shouldSample()

> **shouldSample**(`span`): `boolean`

Defined in: [types/observability.ts:225](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L225)

Determine if a span should be sampled

#### Parameters

##### span

[`SpanData`](SpanData.md)

#### Returns

`boolean`

---

### getDescription()

> **getDescription**(): `string`

Defined in: [types/observability.ts:228](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/observability.ts#L228)

Get sampling decision description

#### Returns

`string`
