[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAccessDeniedError

# Class: ModelAccessDeniedError

Defined in: [types/errors.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L210)

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

Defined in: [types/errors.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L215)

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

Defined in: [types/errors.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L18)

#### Inherited from

[`ProviderError`](ProviderError.md).[`provider`](ProviderError.md#provider)

---

### requestedModel

> `readonly` **requestedModel**: `string` \| `undefined`

Defined in: [types/errors.ts:211](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L211)

---

### allowedModels

> `readonly` **allowedModels**: `string`[] \| `undefined`

Defined in: [types/errors.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L212)

---

### code

> `readonly` **code**: `"MODEL_ACCESS_DENIED"`

Defined in: [types/errors.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/errors.ts#L213)
