[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1143)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1144)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1145)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
