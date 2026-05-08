[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvalidModelError

# Class: InvalidModelError

Defined in: [types/errors.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L63)

Thrown when a specified model is not found or is invalid for the provider.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new InvalidModelError**(`message`, `provider?`): `InvalidModelError`

Defined in: [types/errors.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L64)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`InvalidModelError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
