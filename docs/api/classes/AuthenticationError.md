[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationError

# Class: AuthenticationError

Defined in: [types/errors.ts:33](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L33)

Thrown for authentication-related errors, such as invalid or missing API keys.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new AuthenticationError**(`message`, `provider?`): `AuthenticationError`

Defined in: [types/errors.ts:34](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L34)

#### Parameters

##### message

`string`

##### provider?

`string`

#### Returns

`AuthenticationError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)
