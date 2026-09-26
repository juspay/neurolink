[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

---

### generation?

> `optional` **generation?**: `number`

Runtime-config generation of the snapshot the request queued under.
The route always passes one (0 from its fallback snapshot when no
runtime config store is attached); only direct callers such as test
hooks leave it absent.

---

### resolve

> **resolve**: (`lease`) => `void`

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
