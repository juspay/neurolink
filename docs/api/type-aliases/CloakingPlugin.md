[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingPlugin

# Type Alias: CloakingPlugin

> **CloakingPlugin** = `object`

Defined in: [types/proxy.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L388)

Plugin interface for cloaking pipeline.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L390)

Human-readable name for logging / debugging.

---

### order

> **order**: `number`

Defined in: [types/proxy.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L393)

Execution order -- lower numbers run first in processRequest.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L396)

Whether this plugin is active. Disabled plugins are skipped.

---

### transformRequest

> **transformRequest**: (`ctx`) => `Promise`\<[`CloakingContext`](CloakingContext.md)\>

Defined in: [types/proxy.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L402)

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

Defined in: [types/proxy.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L408)

Transform the incoming response before it reaches the client.
Optional -- plugins that only touch requests can skip this.

#### Parameters

##### ctx

[`CloakingContext`](CloakingContext.md)

#### Returns

`Promise`\<[`CloakingContext`](CloakingContext.md)\>
