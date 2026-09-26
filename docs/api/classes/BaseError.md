[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseError

# Class: BaseError

Base error class for all NeuroLink-specific errors.
This allows for easy identification of errors thrown by the SDK.

## Extends

- `Error`

## Extended by

- [`OAuthError`](OAuthError.md)
- [`TokenStoreError`](TokenStoreError.md)
- [`ModelAccessError`](ModelAccessError.md)
- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new BaseError**(`message`): `BaseError`

#### Parameters

##### message

`string`

#### Returns

`BaseError`

#### Overrides

`Error.constructor`
