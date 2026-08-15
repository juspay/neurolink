[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthError

# Class: OAuthError

Defined in: [types/errors.ts:119](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L119)

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

Defined in: [types/errors.ts:120](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L120)

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

Defined in: [types/errors.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L122)
