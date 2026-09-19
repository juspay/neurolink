[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRouterInterface

# Type Alias: ModelRouterInterface

> **ModelRouterInterface** = `object`

Defined in: [types/proxy.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L47)

Type describing the ModelRouter contract.
Defined here to avoid a circular dependency between types and implementation.

## Properties

### getModelMappings?

> `optional` **getModelMappings?**: () => [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/proxy.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L53)

#### Returns

[`ModelMapping`](ModelMapping.md)[]

---

### getPassthroughModels?

> `optional` **getPassthroughModels?**: () => `string`[]

Defined in: [types/proxy.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L54)

#### Returns

`string`[]

## Methods

### resolve()

> **resolve**(`requestedModel`): [`RouteResult`](RouteResult.md)

Defined in: [types/proxy.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L48)

#### Parameters

##### requestedModel

`string`

#### Returns

[`RouteResult`](RouteResult.md)

---

### isClaudeTarget()

> **isClaudeTarget**(`requestedModel`): `boolean`

Defined in: [types/proxy.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L49)

#### Parameters

##### requestedModel

`string`

#### Returns

`boolean`

---

### getFallbackChain()

> **getFallbackChain**(): [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/proxy.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L50)

#### Returns

[`FallbackEntry`](FallbackEntry.md)[]

---

### isAutoFallbackEnabled()?

> `optional` **isAutoFallbackEnabled**(): `boolean`

Defined in: [types/proxy.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L51)

#### Returns

`boolean`

---

### getMaxInflightPerAccount()?

> `optional` **getMaxInflightPerAccount**(): `number` \| `undefined`

Defined in: [types/proxy.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L52)

#### Returns

`number` \| `undefined`
