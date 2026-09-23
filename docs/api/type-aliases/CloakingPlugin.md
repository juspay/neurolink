[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingPlugin

# Type Alias: CloakingPlugin

> **CloakingPlugin** = `object`

Defined in: [types/proxy.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L419)

Plugin interface for cloaking pipeline.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L421)

Human-readable name for logging / debugging.

---

### order

> **order**: `number`

Defined in: [types/proxy.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L424)

Execution order -- lower numbers run first in processRequest.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L427)

Whether this plugin is active. Disabled plugins are skipped.

---

### transformRequest

> **transformRequest**: (`ctx`) => `Promise`\<[`CloakingContext`](CloakingContext.md)\>

Defined in: [types/proxy.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L433)

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

Defined in: [types/proxy.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L439)

Transform the incoming response before it reaches the client.
Optional -- plugins that only touch requests can skip this.

#### Parameters

##### ctx

[`CloakingContext`](CloakingContext.md)

#### Returns

`Promise`\<[`CloakingContext`](CloakingContext.md)\>
