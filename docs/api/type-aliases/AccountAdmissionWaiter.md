[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1395)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1396)

---

### generation?

> `optional` **generation?**: `number`

Defined in: [types/proxy.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1401)

Runtime-config generation of the snapshot the request queued under.
The route always passes one (0 from its fallback snapshot when no
runtime config store is attached); only direct callers such as test
hooks leave it absent.

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1402)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
