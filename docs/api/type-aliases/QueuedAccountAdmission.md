[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1136)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1137)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1138)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1139)

#### Returns

`void`
