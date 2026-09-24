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

### generation?

> `optional` **generation?**: `number`

Defined in: [types/proxy.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1322)

Runtime-config generation of the snapshot the request queued under;
absent when no runtime config store publishes one.

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1323)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
