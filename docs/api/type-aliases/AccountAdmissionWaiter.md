[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L956)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L957)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L958)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
