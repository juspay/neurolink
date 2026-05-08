[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkError

# Class: NetworkError

Defined in: [types/errors.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L45)

Thrown for network-related issues, such as connectivity problems or timeouts.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new NetworkError**(`message`, `provider?`): `NetworkError`

Defined in: [types/errors.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L46)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`NetworkError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
