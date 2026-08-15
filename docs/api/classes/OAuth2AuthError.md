[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2AuthError

# Class: OAuth2AuthError

Defined in: [client/auth.ts:444](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L444)

Error thrown when authentication fails

## Extends

- `Error`

## Constructors

### Constructor

> **new OAuth2AuthError**(`message`, `code?`, `status?`): `OAuth2AuthenticationError`

Defined in: [client/auth.ts:448](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L448)

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

Defined in: [client/auth.ts:445](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L445)

---

### status

> `readonly` **status**: `number`

Defined in: [client/auth.ts:446](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L446)
