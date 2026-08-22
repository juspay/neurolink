[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenRefreshError

# Class: OAuthTokenRefreshError

Defined in: [types/errors.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L155)

Thrown when token refresh fails

## Extends

- [`OAuthError`](OAuthError.md)

## Constructors

### Constructor

> **new OAuthTokenRefreshError**(`message`, `statusCode?`): `OAuthTokenRefreshError`

Defined in: [types/errors.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L156)

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

Defined in: [types/errors.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L122)

#### Inherited from

[`OAuthError`](OAuthError.md).[`code`](OAuthError.md#code)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/errors.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L158)
