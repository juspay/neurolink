[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseError

# Class: BaseError

Defined in: [types/errors.ts:5](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L5)

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

Defined in: [types/errors.ts:6](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L6)

#### Parameters

##### message

`string`

#### Returns

`BaseError`

#### Overrides

`Error.constructor`
