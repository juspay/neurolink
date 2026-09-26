[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRouterInterface

# Type Alias: ModelRouterInterface

> **ModelRouterInterface** = `object`

Type describing the ModelRouter contract.
Defined here to avoid a circular dependency between types and implementation.

## Properties

### getModelMappings?

> `optional` **getModelMappings?**: () => [`ModelMapping`](ModelMapping.md)[]

#### Returns

[`ModelMapping`](ModelMapping.md)[]

---

### getPassthroughModels?

> `optional` **getPassthroughModels?**: () => `string`[]

#### Returns

`string`[]

## Methods

### resolve()

> **resolve**(`requestedModel`): [`RouteResult`](RouteResult.md)

#### Parameters

##### requestedModel

`string`

#### Returns

[`RouteResult`](RouteResult.md)

---

### isClaudeTarget()

> **isClaudeTarget**(`requestedModel`): `boolean`

#### Parameters

##### requestedModel

`string`

#### Returns

`boolean`

---

### getFallbackChain()

> **getFallbackChain**(): [`FallbackEntry`](FallbackEntry.md)[]

#### Returns

[`FallbackEntry`](FallbackEntry.md)[]

---

### isAutoFallbackEnabled()?

> `optional` **isAutoFallbackEnabled**(): `boolean`

#### Returns

`boolean`

---

### getMaxInflightPerAccount()?

> `optional` **getMaxInflightPerAccount**(): `number` \| `undefined`

#### Returns

`number` \| `undefined`
