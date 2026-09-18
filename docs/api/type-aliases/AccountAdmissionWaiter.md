[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1167)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1168)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1169)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
