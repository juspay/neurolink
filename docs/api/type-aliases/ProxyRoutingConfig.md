[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRoutingConfig

# Type Alias: ProxyRoutingConfig

> **ProxyRoutingConfig** = `object`

Defined in: [types/subscription.ts:1115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1115)

Full proxy routing config

## Properties

### strategy

> **strategy**: `"round-robin"` \| `"fill-first"`

Defined in: [types/subscription.ts:1116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1116)

---

### modelMappings

> **modelMappings**: [`ModelMapping`](ModelMapping.md)[]

Defined in: [types/subscription.ts:1117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1117)

---

### fallbackChain

> **fallbackChain**: [`FallbackEntry`](FallbackEntry.md)[]

Defined in: [types/subscription.ts:1118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1118)

---

### passthroughModels?

> `optional` **passthroughModels?**: `string`[]

Defined in: [types/subscription.ts:1119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1119)
