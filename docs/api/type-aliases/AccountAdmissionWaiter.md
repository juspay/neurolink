[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1247)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1248)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1249)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
