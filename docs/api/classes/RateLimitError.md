[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitError

# Class: RateLimitError

Defined in: [types/errors.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L60)

Thrown when an API rate limit has been exceeded.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new RateLimitError**(`message`, `provider?`): `RateLimitError`

Defined in: [types/errors.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L61)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`RateLimitError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
