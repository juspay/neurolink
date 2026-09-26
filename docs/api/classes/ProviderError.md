[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderError

# Class: ProviderError

Thrown when a provider encounters a generic error.

## Extends

- [`BaseError`](BaseError.md)

## Extended by

- [`ModelAccessDeniedError`](ModelAccessDeniedError.md)
- [`AuthenticationError`](AuthenticationError.md)
- [`AuthorizationError`](AuthorizationError.md)
- [`NetworkError`](NetworkError.md)
- [`RateLimitError`](RateLimitError.md)
- [`InvalidModelError`](InvalidModelError.md)

## Constructors

### Constructor

> **new ProviderError**(`message`, `provider?`): `ProviderError`

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
