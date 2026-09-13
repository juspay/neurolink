[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1046)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1047)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1048)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
