[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1240)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1241)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1242)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1243)

#### Returns

`void`
