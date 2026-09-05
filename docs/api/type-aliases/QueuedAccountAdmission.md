[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedAccountAdmission

# Type Alias: QueuedAccountAdmission

> **QueuedAccountAdmission** = `object`

Defined in: [types/proxy.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L949)

A cancellable queued request for per-account admission capacity.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

---

### promise

> **promise**: `Promise`\<[`AccountAdmissionLease`](AccountAdmissionLease.md)\>

Defined in: [types/proxy.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L951)

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

#### Returns

`void`
