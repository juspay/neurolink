[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderError

# Class: ProviderError

Defined in: [types/errors.ts:15](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L15)

Thrown when a provider encounters a generic error.

## Extends

- [`BaseError`](BaseError.md)

## Extended by

- [`AuthenticationError`](AuthenticationError.md)
- [`AuthorizationError`](AuthorizationError.md)
- [`NetworkError`](NetworkError.md)
- [`RateLimitError`](RateLimitError.md)
- [`InvalidModelError`](InvalidModelError.md)
- [`ModelAccessDeniedError`](ModelAccessDeniedError.md)

## Constructors

### Constructor

> **new ProviderError**(`message`, `provider?`): `ProviderError`

Defined in: [types/errors.ts:16](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L16)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`ProviderError`

#### Overrides

[`BaseError`](BaseError.md).[`constructor`](BaseError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L18)
