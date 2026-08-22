[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRouterInterface

# Type Alias: ModelRouterInterface

> **ModelRouterInterface** = `object`

Defined in: [types/proxy.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L41)

Type describing the ModelRouter contract.
Defined here to avoid a circular dependency between types and implementation.

## Properties

### getModelMappings?

> `optional` **getModelMappings?**: () => [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/proxy.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L47)

#### Returns

[`ModelMapping`](ModelMapping.md)[]

---

### getPassthroughModels?

> `optional` **getPassthroughModels?**: () => `string`[]

Defined in: [types/proxy.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L48)

#### Returns

`string`[]

## Methods

### resolve()

> **resolve**(`requestedModel`): [`RouteResult`](RouteResult.md)

Defined in: [types/proxy.ts:42](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L42)

#### Parameters

##### requestedModel

`string`

#### Returns

[`RouteResult`](RouteResult.md)

---

### isClaudeTarget()

> **isClaudeTarget**(`requestedModel`): `boolean`

Defined in: [types/proxy.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L43)

#### Parameters

##### requestedModel

`string`

#### Returns

`boolean`

---

### getFallbackChain()

> **getFallbackChain**(): [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/proxy.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L44)

#### Returns

[`FallbackEntry`](FallbackEntry.md)[]

---

### isAutoFallbackEnabled()?

> `optional` **isAutoFallbackEnabled**(): `boolean`

Defined in: [types/proxy.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L45)

#### Returns

`boolean`

---

### getMaxInflightPerAccount()?

> `optional` **getMaxInflightPerAccount**(): `number` \| `undefined`

Defined in: [types/proxy.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L46)

#### Returns

`number` \| `undefined`
