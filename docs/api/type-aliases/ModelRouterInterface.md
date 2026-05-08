[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRouterInterface

# Type Alias: ModelRouterInterface

> **ModelRouterInterface** = `object`

Defined in: [types/proxy.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L33)

Type describing the ModelRouter contract.
Defined here to avoid a circular dependency between types and implementation.

## Methods

### resolve()

> **resolve**(`requestedModel`): [`RouteResult`](RouteResult.md)

Defined in: [types/proxy.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L34)

#### Parameters

##### requestedModel

`string`

#### Returns

[`RouteResult`](RouteResult.md)

---

### isClaudeTarget()

> **isClaudeTarget**(`requestedModel`): `boolean`

Defined in: [types/proxy.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L35)

#### Parameters

##### requestedModel

`string`

#### Returns

`boolean`

---

### getFallbackChain()

> **getFallbackChain**(): [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/proxy.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L36)

#### Returns

[`FallbackEntry`](FallbackEntry.md)[]
