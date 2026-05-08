[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenRefreshError

# Class: OAuthTokenRefreshError

Defined in: [types/errors.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L112)

Thrown when token refresh fails

## Extends

- [`OAuthError`](OAuthError.md)

## Constructors

### Constructor

> **new OAuthTokenRefreshError**(`message`, `statusCode?`): `OAuthTokenRefreshError`

Defined in: [types/errors.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L113)

#### Parameters

##### message

`string`

##### statusCode?

`number`

#### Returns

`OAuthTokenRefreshError`

#### Overrides

[`OAuthError`](OAuthError.md).[`constructor`](OAuthError.md#constructor)

## Properties

### code?

> `optional` **code?**: `string`

Defined in: [types/errors.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L79)

#### Inherited from

[`OAuthError`](OAuthError.md).[`code`](OAuthError.md#code)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/errors.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L115)
