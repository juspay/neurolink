[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRouterInterface

# Type Alias: ModelRouterInterface

> **ModelRouterInterface** = `object`

Defined in: [types/proxy.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L53)

Type describing the ModelRouter contract.
Defined here to avoid a circular dependency between types and implementation.

## Properties

### getModelMappings?

> `optional` **getModelMappings?**: () => [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/proxy.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L59)

#### Returns

[`ModelMapping`](ModelMapping.md)[]

---

### getPassthroughModels?

> `optional` **getPassthroughModels?**: () => `string`[]

Defined in: [types/proxy.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L60)

#### Returns

`string`[]

## Methods

### resolve()

> **resolve**(`requestedModel`): [`RouteResult`](RouteResult.md)

Defined in: [types/proxy.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L54)

#### Parameters

##### requestedModel

`string`

#### Returns

[`RouteResult`](RouteResult.md)

---

### isClaudeTarget()

> **isClaudeTarget**(`requestedModel`): `boolean`

Defined in: [types/proxy.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L55)

#### Parameters

##### requestedModel

`string`

#### Returns

`boolean`

---

### getFallbackChain()

> **getFallbackChain**(): [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/proxy.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L56)

#### Returns

[`FallbackEntry`](FallbackEntry.md)[]

---

### isAutoFallbackEnabled()?

> `optional` **isAutoFallbackEnabled**(): `boolean`

Defined in: [types/proxy.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L57)

#### Returns

`boolean`

---

### getMaxInflightPerAccount()?

> `optional` **getMaxInflightPerAccount**(): `number` \| `undefined`

Defined in: [types/proxy.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L58)

#### Returns

`number` \| `undefined`
