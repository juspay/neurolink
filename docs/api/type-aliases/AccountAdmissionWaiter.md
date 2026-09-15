[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1150)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1151)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1152)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
