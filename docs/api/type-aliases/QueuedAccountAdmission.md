[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1160)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1161)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1162)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1163)

#### Returns

`void`
