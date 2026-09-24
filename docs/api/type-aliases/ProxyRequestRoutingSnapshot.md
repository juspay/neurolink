[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:3617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3617)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:3618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3618)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:3619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3619)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:3620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3620)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:3621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3621)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:3622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3622)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:3623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3623)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:3624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3624)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:3625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3625)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:3626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3626)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:3629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3629)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
