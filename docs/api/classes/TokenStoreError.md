[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStoreError

# Class: TokenStoreError

Defined in: [types/errors.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L162)

Token storage error for authentication-related failures

## Extends

- [`BaseError`](BaseError.md)

## Constructors

### Constructor

> **new TokenStoreError**(`message`, `code?`): `TokenStoreError`

Defined in: [types/errors.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L163)

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

Defined in: [types/errors.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L165)
