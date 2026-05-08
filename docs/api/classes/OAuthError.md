[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthError

# Class: OAuthError

Defined in: [types/errors.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L76)

Base class for OAuth-specific errors

## Extends

- [`BaseError`](BaseError.md)

## Extended by

- [`OAuthConfigurationError`](OAuthConfigurationError.md)
- [`OAuthTokenExchangeError`](OAuthTokenExchangeError.md)
- [`OAuthTokenRefreshError`](OAuthTokenRefreshError.md)
- [`OAuthTokenValidationError`](OAuthTokenValidationError.md)
- [`OAuthTokenRevocationError`](OAuthTokenRevocationError.md)
- [`OAuthCallbackServerError`](OAuthCallbackServerError.md)

## Constructors

### Constructor

> **new OAuthError**(`message`, `code?`): `OAuthError`

Defined in: [types/errors.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L77)

#### Parameters

##### message

`string`

##### code?

`string`

#### Returns

`OAuthError`

#### Overrides

[`BaseError`](BaseError.md).[`constructor`](BaseError.md#constructor)

## Properties

### code?

> `optional` **code?**: `string`

Defined in: [types/errors.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L79)
