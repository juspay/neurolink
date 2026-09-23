[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1298)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1299)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
