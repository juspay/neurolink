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

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

Runtime-config generation of the snapshot the request queued under.
The route always passes one (0 from its fallback snapshot when no
runtime config store is attached); only direct callers such as test
hooks leave it absent.

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
