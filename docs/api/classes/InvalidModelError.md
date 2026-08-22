[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvalidModelError

# Class: InvalidModelError

Defined in: [types/errors.ts:69](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L69)

Thrown when a specified model is not found or is invalid for the provider.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new InvalidModelError**(`message`, `provider?`): `InvalidModelError`

Defined in: [types/errors.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L70)

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

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
