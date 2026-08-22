[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2Error

# Class: OAuth2Error

Defined in: [client/auth.ts:429](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L429)

Error thrown during OAuth2 operations

## Extends

- `Error`

## Constructors

### Constructor

> **new OAuth2Error**(`message`, `status`, `responseBody`): `OAuth2Error`

Defined in: [client/auth.ts:433](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L433)

#### Parameters

##### message

`string`

##### status

`number`

##### responseBody

`string`

#### Returns

`OAuth2Error`

#### Overrides

`Error.constructor`

## Properties

### status

> `readonly` **status**: `number`

Defined in: [client/auth.ts:430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L430)

---

### responseBody

> `readonly` **responseBody**: `string`

Defined in: [client/auth.ts:431](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L431)
