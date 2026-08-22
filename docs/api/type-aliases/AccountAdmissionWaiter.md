[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountAdmissionWaiter

# Type Alias: AccountAdmissionWaiter

> **AccountAdmissionWaiter** = `object`

Defined in: [types/proxy.ts:888](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L888)

One queued request waiting for per-account admission capacity.

## Properties

### capacity

> **capacity**: `number`

Defined in: [types/proxy.ts:889](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L889)

---

### resolve

> **resolve**: (`lease`) => `void`

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L890)

#### Parameters

##### lease

[`AccountAdmissionLease`](AccountAdmissionLease.md)

#### Returns

`void`
