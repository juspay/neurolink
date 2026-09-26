[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessDeniedError

# Class: ModelAccessDeniedError

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

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)

---

### requestedModel

> `readonly` **requestedModel**: `string` \| `undefined`

---

### allowedModels

> `readonly` **allowedModels**: `string`[] \| `undefined`

---

### code

> `readonly` **code**: `"MODEL_ACCESS_DENIED"`
