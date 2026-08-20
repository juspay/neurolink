[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestRoutingSnapshot

# Type Alias: ProxyRequestRoutingSnapshot

> **ProxyRequestRoutingSnapshot** = `object`

Defined in: [types/proxy.ts:2902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2902)

Routing values captured once when a proxy request begins.

## Properties

### generation

> **generation**: `number`

Defined in: [types/proxy.ts:2903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2903)

---

### strategy

> **strategy**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

Defined in: [types/proxy.ts:2904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2904)

---

### modelRouter?

> `optional` **modelRouter?**: [`ModelRouterInterface`](ModelRouterInterface.md)

Defined in: [types/proxy.ts:2905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2905)

---

### passthrough

> **passthrough**: `boolean`

Defined in: [types/proxy.ts:2906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2906)

---

### primaryAccountKey?

> `optional` **primaryAccountKey?**: `string`

Defined in: [types/proxy.ts:2907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2907)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `ReadonlySet`\<`string`\>

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:2910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2910)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

---

### useOverage

> **useOverage**: [`ProxyOveragePolicy`](ProxyOveragePolicy.md)

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

Operator policy on spending paid extra usage once a subscription window is
spent. Only "never" can override the provider's own signal.
