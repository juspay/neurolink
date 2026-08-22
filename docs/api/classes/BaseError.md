[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseError

# Class: BaseError

Defined in: [types/errors.ts:5](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L5)

Base error class for all NeuroLink-specific errors.
This allows for easy identification of errors thrown by the SDK.

## Extends

- `Error`

## Extended by

- [`ProviderError`](ProviderError.md)
- [`OAuthError`](OAuthError.md)
- [`TokenStoreError`](TokenStoreError.md)
- [`ModelAccessError`](ModelAccessError.md)

## Constructors

### Constructor

> **new BaseError**(`message`): `BaseError`

Defined in: [types/errors.ts:6](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L6)

#### Parameters

##### message

`string`

#### Returns

`BaseError`

#### Overrides

`Error.constructor`
