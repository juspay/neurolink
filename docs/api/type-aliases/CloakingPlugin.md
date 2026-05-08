[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingPlugin

# Type Alias: CloakingPlugin

> **CloakingPlugin** = `object`

Defined in: [types/proxy.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L369)

Plugin interface for cloaking pipeline.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:371](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L371)

Human-readable name for logging / debugging.

---

### order

> **order**: `number`

Defined in: [types/proxy.ts:374](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L374)

Execution order -- lower numbers run first in processRequest.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L377)

Whether this plugin is active. Disabled plugins are skipped.

---

### transformRequest

> **transformRequest**: (`ctx`) => `Promise`\<[`CloakingContext`](CloakingContext.md)\>

Defined in: [types/proxy.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L383)

Transform the outgoing request before it reaches the upstream API.
Must return a (possibly mutated) context.

#### Parameters

##### ctx

[`CloakingContext`](CloakingContext.md)

#### Returns

`Promise`\<[`CloakingContext`](CloakingContext.md)\>

---

### transformResponse?

> `optional` **transformResponse?**: (`ctx`) => `Promise`\<[`CloakingContext`](CloakingContext.md)\>

Defined in: [types/proxy.ts:389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L389)

Transform the incoming response before it reaches the client.
Optional -- plugins that only touch requests can skip this.

#### Parameters

##### ctx

[`CloakingContext`](CloakingContext.md)

#### Returns

`Promise`\<[`CloakingContext`](CloakingContext.md)\>
