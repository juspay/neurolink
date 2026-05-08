[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2AuthError

# Class: OAuth2AuthError

Defined in: [client/auth.ts:447](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L447)

Error thrown when authentication fails

## Extends

- `Error`

## Constructors

### Constructor

> **new OAuth2AuthError**(`message`, `code?`, `status?`): `OAuth2AuthenticationError`

Defined in: [client/auth.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L451)

#### Parameters

##### message

`string`

##### code?

`string` = `"AUTH_ERROR"`

##### status?

`number` = `401`

#### Returns

`OAuth2AuthenticationError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `string`

Defined in: [client/auth.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L448)

---

### status

> `readonly` **status**: `number`

Defined in: [client/auth.ts:449](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L449)
