[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1318)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1319)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1320)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
