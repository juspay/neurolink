[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessDeniedError

# Class: ModelAccessDeniedError

Defined in: [types/errors.ts:253](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L253)

Curator P1-1: thrown when a provider rejects a request because the
caller's team / API key is not whitelisted for the requested model.

LiteLLM's `team not allowed to access model. This team can only access
models=['glm-latest', 'kimi-latest', ...]` is the canonical example —
the list is parsed off the error body so callers / fallback orchestrators
can choose a whitelisted alternative without scraping strings.

## Extends

- [`ProviderError`](ProviderError.md)

## Constructors

### Constructor

> **new ModelAccessDeniedError**(`message`, `options?`): `ModelAccessDeniedError`

Defined in: [types/errors.ts:258](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L258)

#### Parameters

##### message

`string`

##### options?

###### provider?

`string`

###### requestedModel?

`string`

###### allowedModels?

`string`[]

#### Returns

`ModelAccessDeniedError`

#### Overrides

[`ProviderError`](ProviderError.md).[`constructor`](ProviderError.md#constructor)

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/errors.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)

---

### requestedModel

> `readonly` **requestedModel**: `string` \| `undefined`

Defined in: [types/errors.ts:254](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L254)

---

### allowedModels

> `readonly` **allowedModels**: `string`[] \| `undefined`

Defined in: [types/errors.ts:255](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L255)

---

### code

> `readonly` **code**: `"MODEL_ACCESS_DENIED"`

Defined in: [types/errors.ts:256](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L256)
