[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1405)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1406)

---

### generation?

> `optional` **generation?**: `number`

Defined in: [types/proxy.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1411)

Runtime-config generation of the snapshot the request queued under.
The route always passes one (0 from its fallback snapshot when no
runtime config store is attached); only direct callers such as test
hooks leave it absent.

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1412)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
