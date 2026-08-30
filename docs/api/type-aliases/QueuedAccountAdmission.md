[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L938)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L939)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L940)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L941)

#### Returns

`void`
