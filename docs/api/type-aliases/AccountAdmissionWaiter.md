[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1383)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1384)

---

### generation?

> `optional` **generation?**: `number`

Defined in: [types/proxy.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1387)

Runtime-config generation of the snapshot the request queued under;
absent when no runtime config store publishes one.

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1388)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
