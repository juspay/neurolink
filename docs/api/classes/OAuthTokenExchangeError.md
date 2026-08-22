[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenExchangeError

# Class: OAuthTokenExchangeError

Defined in: [types/errors.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L142)

Thrown when authorization code exchange fails

## Extends

- [`OAuthError`](OAuthError.md)

## Constructors

### Constructor

> **new OAuthTokenExchangeError**(`message`, `statusCode?`): `OAuthTokenExchangeError`

Defined in: [types/errors.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L143)

#### Parameters

##### message

`string`

##### statusCode?

`number`

#### Returns

`OAuthTokenExchangeError`

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

Defined in: [types/errors.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L145)
