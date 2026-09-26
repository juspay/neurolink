[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingPlugin

# Type Alias: CloakingPlugin

> **CloakingPlugin** = `object`

Plugin interface for cloaking pipeline.

## Properties

### name

> **name**: `string`

Human-readable name for logging / debugging.

---

### order

> **order**: `number`

Execution order -- lower numbers run first in processRequest.

---

### enabled

> **enabled**: `boolean`

Whether this plugin is active. Disabled plugins are skipped.

---

### transformRequest

> **transformRequest**: (`ctx`) => `Promise`\<[`CloakingContext`](CloakingContext.md)\>

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

Transform the incoming response before it reaches the client.
Optional -- plugins that only touch requests can skip this.

#### Parameters

##### ctx

[`CloakingContext`](CloakingContext.md)

#### Returns

`Promise`\<[`CloakingContext`](CloakingContext.md)\>
