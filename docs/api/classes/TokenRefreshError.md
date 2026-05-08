[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefreshError

# Class: TokenRefreshError

Defined in: [client/auth.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L466)

Error thrown when token refresh fails

## Extends

- `Error`

## Constructors

### Constructor

> **new TokenRefreshError**(`message`, `cause?`): `TokenRefreshError`

Defined in: [client/auth.ts:469](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L469)

#### Parameters

##### message

`string`

##### cause?

`Error`

#### Returns

`TokenRefreshError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `readonly` `optional` **cause?**: `Error`

Defined in: [client/auth.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L467)

#### Overrides

`Error.cause`
