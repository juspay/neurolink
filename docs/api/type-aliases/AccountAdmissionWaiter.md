[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L945)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L946)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L947)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
