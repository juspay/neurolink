[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenRevocationError

# Class: OAuthTokenRevocationError

Defined in: [types/errors.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L178)

Thrown when token revocation fails

## Extends

- [`OAuthError`](OAuthError.md)

## Constructors

### Constructor

> **new OAuthTokenRevocationError**(`message`, `statusCode?`): `OAuthTokenRevocationError`

Defined in: [types/errors.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L179)

#### Parameters

##### message

`string`

##### statusCode?

`number`

#### Returns

`OAuthTokenRevocationError`

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

Defined in: [types/errors.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L181)
