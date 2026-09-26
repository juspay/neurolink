[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2AuthError

# Class: OAuth2AuthError

Error thrown when authentication fails

## Extends

- `Error`

## Constructors

### Constructor

> **new OAuth2AuthError**(`message`, `code?`, `status?`): `OAuth2AuthenticationError`

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

---

### status

> `readonly` **status**: `number`
