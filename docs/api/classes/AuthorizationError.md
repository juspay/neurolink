[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthorizationError

# Class: AuthorizationError

Defined in: [types/errors.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L42)

Thrown for authorization errors, where the user does not have permission.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new AuthorizationError**(`message`, `provider?`): `AuthorizationError`

Defined in: [types/errors.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L43)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`AuthorizationError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
