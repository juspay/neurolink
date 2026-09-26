[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthError

# Class: OAuthError

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
