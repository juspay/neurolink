[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderError

# Class: ProviderError

Defined in: [types/errors.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L15)

Thrown when a provider encounters a generic error.

## Extends

- [`BaseError`](BaseError.md)

## Extended by

- [`NetworkError`](NetworkError.md)
- [`InvalidModelError`](InvalidModelError.md)
- [`ModelAccessDeniedError`](ModelAccessDeniedError.md)

## Constructors

### Constructor

> **new ProviderError**(`message`, `provider?`): `ProviderError`

Defined in: [types/errors.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L16)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`ProviderError`

#### Overrides

[`BaseError`](BaseError.md).[`constructor`](BaseError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L18)
