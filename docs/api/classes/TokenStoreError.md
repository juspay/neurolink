[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStoreError

# Class: TokenStoreError

Defined in: [types/errors.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L205)

Token storage error for authentication-related failures

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new TokenStoreError**(`message`, `code?`): `TokenStoreError`

Defined in: [types/errors.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L206)

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

Defined in: [types/errors.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L208)
