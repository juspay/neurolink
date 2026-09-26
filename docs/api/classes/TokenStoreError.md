[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStoreError

# Class: TokenStoreError

Token storage error for authentication-related failures

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new TokenStoreError**(`message`, `code?`): `TokenStoreError`

#### Parameters

##### message

`string`

##### code?

`"STORAGE_ERROR"` \| `"ENCRYPTION_ERROR"` \| `"VALIDATION_ERROR"` \| `"NOT_FOUND"` \| `"REFRESH_ERROR"`

#### Returns

`TokenStoreError`

#### Overrides

[`BaseError`](BaseError.md).[`constructor`](BaseError.md#constructor)

## Properties

### code

> `readonly` **code**: `"STORAGE_ERROR"` \| `"ENCRYPTION_ERROR"` \| `"VALIDATION_ERROR"` \| `"NOT_FOUND"` \| `"REFRESH_ERROR"` = `"STORAGE_ERROR"`
