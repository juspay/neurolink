[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkError

# Class: NetworkError

Defined in: [types/errors.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L51)

Thrown for network-related issues, such as connectivity problems or timeouts.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new NetworkError**(`message`, `provider?`): `NetworkError`

Defined in: [types/errors.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L52)

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

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
