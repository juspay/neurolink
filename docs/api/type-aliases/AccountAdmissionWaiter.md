[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1152)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1153)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1154)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
