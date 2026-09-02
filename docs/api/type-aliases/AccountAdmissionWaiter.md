[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L951)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L953)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
