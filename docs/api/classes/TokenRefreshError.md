[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenRefreshError

# Class: TokenRefreshError

Defined in: [client/auth.ts:463](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L463)

Error thrown when token refresh fails

## Extends

- `Error`

## Constructors

### Constructor

> **new TokenRefreshError**(`message`, `cause?`): `TokenRefreshError`

Defined in: [client/auth.ts:466](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L466)

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

Defined in: [client/auth.ts:464](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L464)

#### Overrides

`Error.cause`
